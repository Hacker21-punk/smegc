import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { getCorsHeaders } from "../_shared/cors.ts";


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    // Authentication check - require valid authorization
    const authHeader = req.headers.get('Authorization');
    const scheduledScanSecret = Deno.env.get('SCHEDULED_SCAN_SECRET');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Accept either the dedicated scheduled scan secret or the service role key
    // This allows both cron jobs (with secret) and internal service calls (with service role)
    const isValidAuth = authHeader && (
      authHeader === `Bearer ${scheduledScanSecret}` ||
      authHeader === `Bearer ${serviceRoleKey}`
    );
    
    if (!isValidAuth) {
      console.error('Unauthorized scheduled scan attempt - missing or invalid auth');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - valid authentication required' }),
        { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey ?? ''
    );

    console.log('Starting scheduled scan for all connected accounts...');

    // Get all connected AWS accounts
    const { data: accounts, error: accountsError } = await supabaseClient
      .from('aws_accounts')
      .select('id, account_id, organization_id')
      .eq('status', 'connected');

    if (accountsError) {
      throw new Error(`Failed to fetch accounts: ${accountsError.message}`);
    }

    if (!accounts || accounts.length === 0) {
      console.log('No connected accounts to scan');
      return new Response(JSON.stringify({ message: 'No connected accounts' }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${accounts.length} connected accounts`);

    const results: { account_id: string; scan_job_id: string; status: string }[] = [];

    for (const account of accounts) {
      try {
        // Check if there's already a pending/running scan
        const { data: existingScans } = await supabaseClient
          .from('scan_jobs')
          .select('id')
          .eq('aws_account_id', account.id)
          .in('status', ['pending', 'running'])
          .limit(1);

        if (existingScans && existingScans.length > 0) {
          console.log(`Skipping account ${account.account_id} - scan already in progress`);
          results.push({
            account_id: account.account_id,
            scan_job_id: existingScans[0].id,
            status: 'skipped_already_running',
          });
          continue;
        }

        // Create a new scan job
        const { data: scanJob, error: scanJobError } = await supabaseClient
          .from('scan_jobs')
          .insert({
            aws_account_id: account.id,
            status: 'pending',
            services_scanned: ['security_groups', 'iam'],
          })
          .select()
          .single();

        if (scanJobError || !scanJob) {
          console.error(`Failed to create scan job for ${account.account_id}:`, scanJobError);
          results.push({
            account_id: account.account_id,
            scan_job_id: '',
            status: 'failed_to_create',
          });
          continue;
        }

        // Trigger the scanner asynchronously
        const scannerUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/aws-scanner`;
        
        fetch(scannerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            aws_account_id: account.id,
            scan_job_id: scanJob.id,
            services: ['security_groups', 'iam'],
          }),
        }).then(async (res) => {
          if (!res.ok) {
            console.error(`Scanner failed for ${account.account_id}:`, await res.text());
          }
        }).catch((err) => {
          console.error(`Scanner call failed for ${account.account_id}:`, err);
        });

        results.push({
          account_id: account.account_id,
          scan_job_id: scanJob.id,
          status: 'initiated',
        });

        console.log(`Initiated scan for account ${account.account_id}`);
      } catch (err) {
        console.error(`Error processing account ${account.account_id}:`, err);
        results.push({
          account_id: account.account_id,
          scan_job_id: '',
          status: 'error',
        });
      }
    }

    console.log(`Scheduled scan complete. Initiated ${results.filter(r => r.status === 'initiated').length} scans`);

    return new Response(JSON.stringify({
      success: true,
      accounts_processed: accounts.length,
      results,
    }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Scheduled scan error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
