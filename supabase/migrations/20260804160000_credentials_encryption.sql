-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vault WITH SCHEMA vault;

-- Create a secret key in Vault for credentials encryption if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'cloud_credentials_key') THEN
    PERFORM vault.create_secret(
      encode(gen_random_bytes(32), 'hex'),
      'cloud_credentials_key',
      'Key used for encrypting and decrypting cloud credentials'
    );
  END IF;
END $$;

-- Create encryption helper function
CREATE OR REPLACE FUNCTION public.encrypt_cloud_credentials(creds jsonb)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  key_val text;
BEGIN
  SELECT decrypted_secret INTO key_val
  FROM vault.decrypted_secrets
  WHERE name = 'cloud_credentials_key'
  LIMIT 1;

  IF key_val IS NULL THEN
    RAISE EXCEPTION 'Credentials encryption key not found in Vault';
  END IF;

  RETURN pgp_sym_encrypt(creds::text, key_val);
END;
$$;

-- Alter credentials_encrypted column to bytea, converting existing data
ALTER TABLE public.cloud_accounts 
  ALTER COLUMN credentials_encrypted TYPE bytea 
  USING public.encrypt_cloud_credentials(credentials_encrypted);

-- Drop the old jsonb default value from the column
ALTER TABLE public.cloud_accounts ALTER COLUMN credentials_encrypted DROP DEFAULT;

-- Create decryption helper function
CREATE OR REPLACE FUNCTION public.decrypt_cloud_credentials(encrypted bytea)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  key_val text;
  decrypted_text text;
BEGIN
  SELECT decrypted_secret INTO key_val
  FROM vault.decrypted_secrets
  WHERE name = 'cloud_credentials_key'
  LIMIT 1;

  IF key_val IS NULL THEN
    RAISE EXCEPTION 'Credentials encryption key not found in Vault';
  END IF;

  decrypted_text := pgp_sym_decrypt(encrypted, key_val);
  RETURN decrypted_text::jsonb;
END;
$$;

-- Set up permissions for helper functions
REVOKE EXECUTE ON FUNCTION public.decrypt_cloud_credentials(bytea) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.decrypt_cloud_credentials(bytea) TO service_role;

REVOKE EXECUTE ON FUNCTION public.encrypt_cloud_credentials(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.encrypt_cloud_credentials(jsonb) TO authenticated, service_role;

-- Re-assert column-level select permissions on cloud_accounts for security
REVOKE SELECT ON public.cloud_accounts FROM authenticated;
GRANT SELECT (id, organization_id, provider, account_name, account_identifier, status,
              last_scan_at, risk_score, metadata, created_at, updated_at)
  ON public.cloud_accounts TO authenticated;
