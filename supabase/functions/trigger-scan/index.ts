import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { z } from "https://esm.sh/zod@3.22.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Zod schema for request validation
const TriggerScanSchema = z.object({
  aws_account_id: z.string().uuid('Invalid AWS account ID format'),
  services: z.array(z.enum(['security_groups', 'iam', 's3', 'ec2', 'rds', 'vpc', 'cost'])).default(['security_groups', 'iam'])
});

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header to validate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate request body with zod schema
    let validatedBody;
    try {
      const rawBody = await req.json();
      validatedBody = TriggerScanSchema.parse(rawBody);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return new Response(JSON.stringify({ 
          error: 'Invalid request', 
          details: validationError.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw validationError;
    }
    
    const { aws_account_id, services } = validatedBody;

    // Verify user has access to this AWS account (via their organization)
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return new Response(JSON.stringify({ error: 'User has no organization' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: account, error: accountError } = await supabaseClient
      .from('aws_accounts')
      .select('*')
      .eq('id', aws_account_id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (accountError || !account) {
      return new Response(JSON.stringify({ error: 'AWS account not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (account.status !== 'connected') {
      return new Response(JSON.stringify({ error: 'AWS account is not connected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for existing pending/running scans
    const { data: existingScans } = await supabaseClient
      .from('scan_jobs')
      .select('id, status')
      .eq('aws_account_id', aws_account_id)
      .in('status', ['pending', 'running'])
      .limit(1);

    if (existingScans && existingScans.length > 0) {
      // Return 200 so the frontend can handle this gracefully (not treated as a runtime error)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'A scan is already in progress for this account',
          scan_job_id: existingScans[0].id,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create a new scan job using service role (bypasses RLS)
    const { data: scanJob, error: scanJobError } = await serviceClient
      .from('scan_jobs')
      .insert({
        aws_account_id,
        status: 'pending',
        services_scanned: services,
      })
      .select()
      .single();

    if (scanJobError || !scanJob) {
      console.error('Error creating scan job:', scanJobError);
      return new Response(JSON.stringify({ error: 'Failed to create scan job' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Created scan job ${scanJob.id} for account ${aws_account_id}`);

    // Trigger the scanner function asynchronously
    const scannerUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/aws-scanner`;
    
    // Call scanner in background (don't await)
    fetch(scannerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        aws_account_id,
        scan_job_id: scanJob.id,
        services,
      }),
    }).then(async (res) => {
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Scanner function error:', errorText);
      } else {
        console.log('Scanner function completed successfully');
      }
    }).catch((err) => {
      console.error('Failed to call scanner function:', err);
    });

    return new Response(JSON.stringify({
      success: true,
      scan_job_id: scanJob.id,
      message: 'Scan initiated successfully',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Trigger scan error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
