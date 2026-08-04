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
      throw new Error(`Failed to fetch AWS accounts: ${accountsError.message}`);
    }

    // Get all connected Azure/GCP cloud accounts
    const { data: cloudAccounts, error: cloudAccountsError } = await supabaseClient
      .from('cloud_accounts')
      .select('id, provider, account_name, account_identifier, organization_id')
      .eq('status', 'connected');

    if (cloudAccountsError) {
      throw new Error(`Failed to fetch cloud accounts: ${cloudAccountsError.message}`);
    }

    const totalAccountsCount = (accounts?.length || 0) + (cloudAccounts?.length || 0);

    if (totalAccountsCount === 0) {
      console.log('No connected accounts to scan');
      return new Response(JSON.stringify({ message: 'No connected accounts' }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${accounts?.length || 0} connected AWS accounts and ${cloudAccounts?.length || 0} connected Azure/GCP accounts`);

    const results: { account_id: string; scan_job_id: string; status: string }[] = [];

    // 1. Process AWS accounts
    if (accounts) {
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
            console.log(`Skipping AWS account ${account.account_id} - scan already in progress`);
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
              console.error(`AWS Scanner failed for ${account.account_id}:`, await res.text());
            }
          }).catch((err) => {
            console.error(`AWS Scanner call failed for ${account.account_id}:`, err);
          });

          results.push({
            account_id: account.account_id,
            scan_job_id: scanJob.id,
            status: 'initiated',
          });

          console.log(`Initiated scan for AWS account ${account.account_id}`);
        } catch (err) {
          console.error(`Error processing AWS account ${account.account_id}:`, err);
          results.push({
            account_id: account.account_id,
            scan_job_id: '',
            status: 'error',
          });
        }
      }
    }

    // 2. Process Azure/GCP cloud accounts (Discovery + Scanner pipeline)
    if (cloudAccounts) {
      for (const account of cloudAccounts) {
        try {
          const discoveryUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/multi-cloud-discovery`;
          const scannerUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/${account.provider}-scanner`;
          
          console.log(`Initiating discovery for ${account.provider} account ${account.account_identifier}...`);
          
          fetch(discoveryUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({ cloud_account_id: account.id }),
          }).then(async (res) => {
            if (!res.ok) {
              console.error(`Discovery failed for ${account.provider} account ${account.account_identifier}:`, await res.text());
              return;
            }
            console.log(`Discovery completed for ${account.provider} account ${account.account_identifier}. Triggering security scanner...`);
            
            return fetch(scannerUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: JSON.stringify({ cloud_account_id: account.id }),
            });
          }).then(async (res) => {
            if (res && !res.ok) {
              console.error(`${account.provider} Scanner failed for ${account.account_identifier}:`, await res.text());
            } else if (res) {
              console.log(`${account.provider} Scanner completed for ${account.account_identifier}`);
            }
          }).catch((err) => {
            console.error(`Discovery/Scanner pipeline failed for ${account.account_identifier}:`, err);
          });

          results.push({
            account_id: account.account_identifier,
            scan_job_id: 'multi-cloud-pipeline',
            status: 'initiated',
          });

          console.log(`Initiated discovery/scan pipeline for ${account.provider} account ${account.account_identifier}`);
        } catch (err) {
          console.error(`Error processing ${account.provider} account ${account.account_identifier}:`, err);
          results.push({
            account_id: account.account_identifier,
            scan_job_id: '',
            status: 'error',
          });
        }
      }
    }

    console.log(`Scheduled scan complete. Initiated ${results.filter(r => r.status === 'initiated').length} scans`);

    return new Response(JSON.stringify({
      success: true,
      accounts_processed: totalAccountsCount,
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
