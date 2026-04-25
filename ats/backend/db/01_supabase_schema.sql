-- =============================================================================
-- SUPABASE LOCAL REPLICA â€” Full Schema
-- Generated from: mtseofeyldyrsxrukwam (project: database)
-- Run this script on a fresh PostgreSQL 15+ instance to replicate Supabase
-- =============================================================================

-- =============================================================================
-- 1. EXTENSIONS (installed in Supabase)
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS graphql;
CREATE SCHEMA IF NOT EXISTS graphql_public;
CREATE SCHEMA IF NOT EXISTS vault;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp"       WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto"        WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA extensions;
-- Optional (install only if needed):
-- CREATE EXTENSION IF NOT EXISTS "pg_graphql"  WITH SCHEMA graphql;
-- CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA vault;

-- =============================================================================
-- 2. ROLES (Supabase system roles)
-- =============================================================================
DO $$
BEGIN
  -- anon: anonymous/unauthenticated access
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  -- authenticated: logged-in users
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  -- service_role: bypasses RLS, used by backend services
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
  -- authenticator: JWT gateway role
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT LOGIN;
    GRANT anon        TO authenticator;
    GRANT authenticated TO authenticator;
    GRANT service_role  TO authenticator;
  END IF;
  -- dashboard_user
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dashboard_user') THEN
    CREATE ROLE dashboard_user NOLOGIN CREATEROLE CREATEDB REPLICATION;
  END IF;
  -- supabase_auth_admin
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    CREATE ROLE supabase_auth_admin NOINHERIT LOGIN CREATEROLE;
  END IF;
  -- supabase_storage_admin
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_storage_admin') THEN
    CREATE ROLE supabase_storage_admin NOINHERIT LOGIN CREATEROLE;
  END IF;
  -- supabase_realtime_admin
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_realtime_admin') THEN
    CREATE ROLE supabase_realtime_admin NOINHERIT NOLOGIN;
  END IF;
END $$;

-- =============================================================================
-- 3. SCHEMAS
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS auth     AUTHORIZATION supabase_auth_admin;
CREATE SCHEMA IF NOT EXISTS storage  AUTHORIZATION supabase_storage_admin;
CREATE SCHEMA IF NOT EXISTS realtime;
CREATE SCHEMA IF NOT EXISTS public;

-- =============================================================================
-- 4. ENUMERATED TYPES
-- =============================================================================

-- auth schema enums
CREATE TYPE auth.aal_level AS ENUM ('aal1', 'aal2', 'aal3');
CREATE TYPE auth.code_challenge_method AS ENUM ('s256', 'plain');
CREATE TYPE auth.factor_status AS ENUM ('unverified', 'verified');
CREATE TYPE auth.factor_type AS ENUM ('totp', 'webauthn', 'phone');
CREATE TYPE auth.one_time_token_type AS ENUM (
  'confirmation_token',
  'reauthentication_token',
  'recovery_token',
  'email_change_token_new',
  'email_change_token_current',
  'phone_change_token'
);
CREATE TYPE auth.oauth_registration_type AS ENUM ('dynamic', 'manual');
CREATE TYPE auth.oauth_client_type AS ENUM ('public', 'confidential');
CREATE TYPE auth.oauth_response_type AS ENUM ('code');
CREATE TYPE auth.oauth_authorization_status AS ENUM ('pending', 'approved', 'denied', 'expired');

-- realtime schema enums
CREATE TYPE realtime.action AS ENUM ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'ERROR');
CREATE TYPE realtime.equality_op AS ENUM ('eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'in');
CREATE TYPE realtime.user_defined_filter AS (
  column_name text,
  op          realtime.equality_op,
  value       text
);

-- storage schema enums
CREATE TYPE storage.buckettype AS ENUM ('STANDARD', 'ANALYTICS', 'VECTOR');

-- =============================================================================
-- 5. AUTH SCHEMA TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS auth.users (
  instance_id                 uuid,
  id                          uuid NOT NULL PRIMARY KEY,
  aud                         varchar(255),
  role                        varchar(255),
  email                       varchar(255),
  encrypted_password          varchar(255),
  email_confirmed_at          timestamptz,
  invited_at                  timestamptz,
  confirmation_token          varchar(255),
  confirmation_sent_at        timestamptz,
  recovery_token              varchar(255),
  recovery_sent_at            timestamptz,
  email_change_token_new      varchar(255),
  email_change                varchar(255),
  email_change_sent_at        timestamptz,
  last_sign_in_at             timestamptz,
  raw_app_meta_data           jsonb,
  raw_user_meta_data          jsonb,
  is_super_admin              boolean,
  created_at                  timestamptz,
  updated_at                  timestamptz,
  phone                       text UNIQUE DEFAULT NULL,
  phone_confirmed_at          timestamptz,
  phone_change                text DEFAULT '',
  phone_change_token          varchar(255) DEFAULT '',
  phone_change_sent_at        timestamptz,
  confirmed_at                timestamptz GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
  email_change_token_current  varchar(255) DEFAULT '',
  email_change_confirm_status smallint DEFAULT 0 CHECK (email_change_confirm_status >= 0 AND email_change_confirm_status <= 2),
  banned_until                timestamptz,
  reauthentication_token      varchar(255) DEFAULT '',
  reauthentication_sent_at    timestamptz,
  is_sso_user                 boolean NOT NULL DEFAULT false,
  deleted_at                  timestamptz,
  is_anonymous                boolean NOT NULL DEFAULT false
);
COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';

CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
  instance_id uuid,
  id          bigserial NOT NULL PRIMARY KEY,
  token       varchar(255) UNIQUE,
  user_id     varchar(255),
  revoked     boolean,
  created_at  timestamptz,
  updated_at  timestamptz,
  parent      varchar(255),
  session_id  uuid
);
COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';

CREATE TABLE IF NOT EXISTS auth.instances (
  id             uuid NOT NULL PRIMARY KEY,
  uuid           uuid,
  raw_base_config text,
  created_at     timestamptz,
  updated_at     timestamptz
);
COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';

CREATE TABLE IF NOT EXISTS auth.audit_log_entries (
  instance_id uuid,
  id          uuid NOT NULL PRIMARY KEY,
  payload     json,
  created_at  timestamptz,
  ip_address  varchar(64) NOT NULL DEFAULT ''
);
COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';

CREATE TABLE IF NOT EXISTS auth.schema_migrations (
  version varchar(255) NOT NULL PRIMARY KEY
);
COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';

CREATE TABLE IF NOT EXISTS auth.sessions (
  id                    uuid NOT NULL PRIMARY KEY,
  user_id               uuid NOT NULL,
  created_at            timestamptz,
  updated_at            timestamptz,
  factor_id             uuid,
  aal                   auth.aal_level,
  not_after             timestamptz,
  refreshed_at          timestamp,
  user_agent            text,
  ip                    inet,
  tag                   text,
  oauth_client_id       uuid,
  refresh_token_hmac_key text,
  refresh_token_counter bigint,
  scopes                text CHECK (char_length(scopes) <= 4096),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';

CREATE TABLE IF NOT EXISTS auth.identities (
  provider_id     text NOT NULL,
  user_id         uuid NOT NULL,
  identity_data   jsonb NOT NULL,
  provider        text NOT NULL,
  last_sign_in_at timestamptz,
  created_at      timestamptz,
  updated_at      timestamptz,
  email           text GENERATED ALWAYS AS (lower(identity_data->>'email')) STORED,
  id              uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';
COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';

CREATE TABLE IF NOT EXISTS auth.mfa_factors (
  id                       uuid NOT NULL PRIMARY KEY,
  user_id                  uuid NOT NULL,
  friendly_name            text,
  factor_type              auth.factor_type NOT NULL,
  status                   auth.factor_status NOT NULL,
  created_at               timestamptz NOT NULL,
  updated_at               timestamptz NOT NULL,
  secret                   text,
  phone                    text,
  last_challenged_at       timestamptz UNIQUE,
  web_authn_credential     jsonb,
  web_authn_aaguid         uuid,
  last_webauthn_challenge_data jsonb,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';

CREATE TABLE IF NOT EXISTS auth.mfa_challenges (
  id               uuid NOT NULL PRIMARY KEY,
  factor_id        uuid NOT NULL,
  created_at       timestamptz NOT NULL,
  verified_at      timestamptz,
  ip_address       inet NOT NULL,
  otp_code         text,
  web_authn_session_data jsonb,
  FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE
);
COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';

CREATE TABLE IF NOT EXISTS auth.mfa_amr_claims (
  session_id            uuid NOT NULL,
  created_at            timestamptz NOT NULL,
  updated_at            timestamptz NOT NULL,
  authentication_method text NOT NULL,
  id                    uuid NOT NULL PRIMARY KEY,
  FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE
);
COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';

CREATE TABLE IF NOT EXISTS auth.sso_providers (
  id          uuid NOT NULL PRIMARY KEY,
  resource_id text CHECK (resource_id IS NULL OR char_length(resource_id) > 0),
  created_at  timestamptz,
  updated_at  timestamptz,
  disabled    boolean
);
COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';

CREATE TABLE IF NOT EXISTS auth.sso_domains (
  id              uuid NOT NULL PRIMARY KEY,
  sso_provider_id uuid NOT NULL,
  domain          text NOT NULL CHECK (char_length(domain) > 0),
  created_at      timestamptz,
  updated_at      timestamptz,
  FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE
);
COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';

CREATE TABLE IF NOT EXISTS auth.saml_providers (
  id              uuid NOT NULL PRIMARY KEY,
  sso_provider_id uuid NOT NULL,
  entity_id       text NOT NULL UNIQUE CHECK (char_length(entity_id) > 0),
  metadata_xml    text NOT NULL CHECK (char_length(metadata_xml) > 0),
  metadata_url    text CHECK (metadata_url IS NULL OR char_length(metadata_url) > 0),
  attribute_mapping jsonb,
  created_at      timestamptz,
  updated_at      timestamptz,
  name_id_format  text,
  FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE
);
COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';

CREATE TABLE IF NOT EXISTS auth.flow_state (
  id                    uuid NOT NULL PRIMARY KEY,
  user_id               uuid,
  auth_code             text,
  code_challenge_method auth.code_challenge_method,
  code_challenge        text,
  provider_type         text NOT NULL,
  provider_access_token text,
  provider_refresh_token text,
  created_at            timestamptz,
  updated_at            timestamptz,
  authentication_method text NOT NULL,
  auth_code_issued_at   timestamptz,
  invite_token          text,
  referrer              text,
  oauth_client_state_id uuid,
  linking_target_id     uuid,
  email_optional        boolean NOT NULL DEFAULT false
);
COMMENT ON TABLE auth.flow_state IS 'Stores metadata for all OAuth/SSO login flows';

CREATE TABLE IF NOT EXISTS auth.saml_relay_states (
  id              uuid NOT NULL PRIMARY KEY,
  sso_provider_id uuid NOT NULL,
  request_id      text NOT NULL CHECK (char_length(request_id) > 0),
  for_email       text,
  redirect_to     text,
  created_at      timestamptz,
  updated_at      timestamptz,
  flow_state_id   uuid,
  FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE,
  FOREIGN KEY (flow_state_id)   REFERENCES auth.flow_state(id) ON DELETE CASCADE
);
COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';

CREATE TABLE IF NOT EXISTS auth.one_time_tokens (
  id          uuid NOT NULL PRIMARY KEY,
  user_id     uuid NOT NULL,
  token_type  auth.one_time_token_type NOT NULL,
  token_hash  text NOT NULL CHECK (char_length(token_hash) > 0),
  relates_to  text NOT NULL,
  created_at  timestamp NOT NULL DEFAULT now(),
  updated_at  timestamp NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS auth.oauth_clients (
  id                        uuid NOT NULL PRIMARY KEY,
  client_secret_hash        text,
  registration_type         auth.oauth_registration_type NOT NULL,
  redirect_uris             text NOT NULL,
  grant_types               text NOT NULL,
  client_name               text CHECK (char_length(client_name) <= 1024),
  client_uri                text CHECK (char_length(client_uri) <= 2048),
  logo_uri                  text CHECK (char_length(logo_uri) <= 2048),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  deleted_at                timestamptz,
  client_type               auth.oauth_client_type NOT NULL DEFAULT 'confidential',
  token_endpoint_auth_method text CHECK (token_endpoint_auth_method IN ('client_secret_basic','client_secret_post','none'))
);

CREATE TABLE IF NOT EXISTS auth.oauth_authorizations (
  id                   uuid NOT NULL PRIMARY KEY,
  authorization_id     text NOT NULL UNIQUE,
  client_id            uuid NOT NULL,
  user_id              uuid,
  redirect_uri         text NOT NULL CHECK (char_length(redirect_uri) <= 2048),
  scope                text NOT NULL CHECK (char_length(scope) <= 4096),
  state                text CHECK (char_length(state) <= 4096),
  resource             text CHECK (char_length(resource) <= 2048),
  code_challenge       text CHECK (char_length(code_challenge) <= 128),
  code_challenge_method auth.code_challenge_method,
  response_type        auth.oauth_response_type NOT NULL DEFAULT 'code',
  status               auth.oauth_authorization_status NOT NULL DEFAULT 'pending',
  authorization_code   text UNIQUE CHECK (char_length(authorization_code) <= 255),
  created_at           timestamptz NOT NULL DEFAULT now(),
  expires_at           timestamptz NOT NULL DEFAULT (now() + interval '3 minutes'),
  approved_at          timestamptz,
  nonce                text CHECK (char_length(nonce) <= 255),
  FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id),
  FOREIGN KEY (user_id)   REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS auth.oauth_consents (
  id         uuid NOT NULL PRIMARY KEY,
  user_id    uuid NOT NULL,
  client_id  uuid NOT NULL,
  scopes     text NOT NULL CHECK (char_length(scopes) <= 2048),
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  FOREIGN KEY (user_id)   REFERENCES auth.users(id),
  FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id)
);

CREATE TABLE IF NOT EXISTS auth.oauth_client_states (
  id            uuid NOT NULL PRIMARY KEY,
  provider_type text NOT NULL,
  code_verifier text,
  created_at    timestamptz NOT NULL
);
COMMENT ON TABLE auth.oauth_client_states IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';

CREATE TABLE IF NOT EXISTS auth.custom_oauth_providers (
  id                    uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_type         text NOT NULL CHECK (provider_type IN ('oauth2','oidc')),
  identifier            text NOT NULL UNIQUE CHECK (identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'),
  name                  text NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  client_id             text NOT NULL CHECK (char_length(client_id) >= 1 AND char_length(client_id) <= 512),
  client_secret         text NOT NULL,
  acceptable_client_ids text[] NOT NULL DEFAULT '{}',
  scopes                text[] NOT NULL DEFAULT '{}',
  pkce_enabled          boolean NOT NULL DEFAULT true,
  attribute_mapping     jsonb NOT NULL DEFAULT '{}',
  authorization_params  jsonb NOT NULL DEFAULT '{}',
  enabled               boolean NOT NULL DEFAULT true,
  email_optional        boolean NOT NULL DEFAULT false,
  issuer                text CHECK (issuer IS NULL OR (char_length(issuer) >= 1 AND char_length(issuer) <= 2048)),
  discovery_url         text CHECK (discovery_url IS NULL OR char_length(discovery_url) <= 2048),
  skip_nonce_check      boolean NOT NULL DEFAULT false,
  cached_discovery      jsonb,
  discovery_cached_at   timestamptz,
  authorization_url     text CHECK (authorization_url IS NULL OR authorization_url LIKE 'https://%'),
  token_url             text CHECK (token_url IS NULL OR token_url LIKE 'https://%'),
  userinfo_url          text CHECK (userinfo_url IS NULL OR userinfo_url LIKE 'https://%'),
  jwks_uri              text CHECK (jwks_uri IS NULL OR jwks_uri LIKE 'https://%'),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth.webauthn_credentials (
  id               uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL,
  credential_id    bytea NOT NULL,
  public_key       bytea NOT NULL,
  attestation_type text NOT NULL DEFAULT '',
  aaguid           uuid,
  sign_count       bigint NOT NULL DEFAULT 0,
  transports       jsonb NOT NULL DEFAULT '[]',
  backup_eligible  boolean NOT NULL DEFAULT false,
  backed_up        boolean NOT NULL DEFAULT false,
  friendly_name    text NOT NULL DEFAULT '',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  last_used_at     timestamptz,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS auth.webauthn_challenges (
  id             uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid,
  challenge_type text NOT NULL CHECK (challenge_type IN ('signup','registration','authentication')),
  session_data   jsonb NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add FK for sessions -> oauth_clients (added after both tables exist)
ALTER TABLE auth.sessions
  ADD CONSTRAINT sessions_oauth_client_id_fkey
  FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id);

-- Add FK for refresh_tokens -> sessions
ALTER TABLE auth.refresh_tokens
  ADD CONSTRAINT refresh_tokens_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;

-- =============================================================================
-- 6. STORAGE SCHEMA TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS storage.buckets (
  id                text NOT NULL PRIMARY KEY,
  name              text NOT NULL,
  owner             uuid,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  public            boolean DEFAULT false,
  avif_autodetection boolean DEFAULT false,
  file_size_limit   bigint,
  allowed_mime_types text[],
  owner_id          text,
  type              storage.buckettype NOT NULL DEFAULT 'STANDARD'
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id              uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket_id       text,
  name            text,
  owner           uuid,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  last_accessed_at timestamptz DEFAULT now(),
  metadata        jsonb,
  path_tokens     text[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED,
  version         text,
  owner_id        text,
  user_metadata   jsonb,
  FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id)
);
COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';

CREATE TABLE IF NOT EXISTS storage.s3_multipart_uploads (
  id               text NOT NULL PRIMARY KEY,
  in_progress_size bigint NOT NULL DEFAULT 0,
  upload_signature text NOT NULL,
  bucket_id        text NOT NULL,
  key              text NOT NULL,
  version          text NOT NULL,
  owner_id         text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  user_metadata    jsonb,
  metadata         jsonb,
  FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id)
);

CREATE TABLE IF NOT EXISTS storage.s3_multipart_uploads_parts (
  id          uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id   text NOT NULL,
  size        bigint NOT NULL DEFAULT 0,
  part_number integer NOT NULL,
  bucket_id   text NOT NULL,
  key         text NOT NULL,
  etag        text NOT NULL,
  owner_id    text,
  version     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (upload_id)  REFERENCES storage.s3_multipart_uploads(id),
  FOREIGN KEY (bucket_id)  REFERENCES storage.buckets(id)
);

CREATE TABLE IF NOT EXISTS storage.migrations (
  id          integer NOT NULL PRIMARY KEY,
  name        varchar(100) NOT NULL UNIQUE,
  hash        varchar(40) NOT NULL,
  executed_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS storage.buckets_analytics (
  id         uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text NOT NULL,
  type       storage.buckettype NOT NULL DEFAULT 'ANALYTICS',
  format     text NOT NULL DEFAULT 'ICEBERG',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS storage.buckets_vectors (
  id         text NOT NULL PRIMARY KEY,
  type       storage.buckettype NOT NULL DEFAULT 'VECTOR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS storage.vector_indexes (
  id                     text NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name                   text NOT NULL,
  bucket_id              text NOT NULL,
  data_type              text NOT NULL,
  dimension              integer NOT NULL,
  distance_metric        text NOT NULL,
  metadata_configuration jsonb,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id)
);

-- =============================================================================
-- 7. REALTIME SCHEMA TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS realtime.schema_migrations (
  version     bigint NOT NULL PRIMARY KEY,
  inserted_at timestamp
);

CREATE TABLE IF NOT EXISTS realtime.subscription (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subscription_id uuid NOT NULL,
  entity          regclass NOT NULL,
  filters         realtime.user_defined_filter[] NOT NULL DEFAULT '{}',
  claims          jsonb NOT NULL,
  created_at      timestamp NOT NULL DEFAULT timezone('utc', now()),
  action_filter   text DEFAULT '*' CHECK (action_filter IN ('*','INSERT','UPDATE','DELETE'))
);

CREATE TABLE IF NOT EXISTS realtime.messages (
  topic       text NOT NULL,
  extension   text NOT NULL,
  payload     jsonb,
  event       text,
  private     boolean DEFAULT false,
  updated_at  timestamp NOT NULL DEFAULT now(),
  inserted_at timestamp NOT NULL DEFAULT now(),
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  PRIMARY KEY (inserted_at, id)
);

-- =============================================================================
-- 8. PUBLIC SCHEMA (your app tables go HERE)
-- =============================================================================
-- Enable RLS automatically on new public tables via event trigger
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
RETURNS event_trigger
LANGUAGE plpgsql AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
    IF cmd.schema_name IS NOT NULL
      AND cmd.schema_name IN ('public')
      AND cmd.schema_name NOT IN ('pg_catalog','information_schema')
      AND cmd.schema_name NOT LIKE 'pg_toast%'
      AND cmd.schema_name NOT LIKE 'pg_temp%'
    THEN
      BEGIN
        EXECUTE format('ALTER TABLE IF EXISTS %s ENABLE ROW LEVEL SECURITY', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
    END IF;
  END LOOP;
END;
$$;

CREATE EVENT TRIGGER rls_auto_enable_trigger
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION public.rls_auto_enable();

-- =============================================================================
-- 9. INDEXES
-- =============================================================================

-- auth indexes
CREATE INDEX IF NOT EXISTS users_instance_id_idx           ON auth.users (instance_id);
CREATE INDEX IF NOT EXISTS users_email_idx                  ON auth.users (email);
CREATE INDEX IF NOT EXISTS users_is_anonymous_idx           ON auth.users (is_anonymous);
CREATE INDEX IF NOT EXISTS refresh_tokens_instance_id_idx  ON auth.refresh_tokens (instance_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_token_idx        ON auth.refresh_tokens (token);
CREATE INDEX IF NOT EXISTS refresh_tokens_session_id_idx   ON auth.refresh_tokens (session_id);
CREATE INDEX IF NOT EXISTS identities_user_id_idx          ON auth.identities (user_id);
CREATE INDEX IF NOT EXISTS identities_email_idx            ON auth.identities (email);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx            ON auth.sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_not_after_idx          ON auth.sessions (not_after DESC);
CREATE INDEX IF NOT EXISTS mfa_factors_user_id_idx         ON auth.mfa_factors (user_id);
CREATE INDEX IF NOT EXISTS mfa_challenges_created_at_idx   ON auth.mfa_challenges (created_at DESC);
CREATE INDEX IF NOT EXISTS one_time_tokens_user_id_idx     ON auth.one_time_tokens (user_id);
CREATE INDEX IF NOT EXISTS one_time_tokens_token_hash_idx  ON auth.one_time_tokens (token_hash);
CREATE INDEX IF NOT EXISTS sso_domains_sso_provider_id_idx ON auth.sso_domains (sso_provider_id);
CREATE INDEX IF NOT EXISTS saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states (sso_provider_id);
CREATE INDEX IF NOT EXISTS flow_state_created_at_idx       ON auth.flow_state (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_entries_instance_id_idx ON auth.audit_log_entries (instance_id);

-- storage indexes
CREATE INDEX IF NOT EXISTS objects_bucket_id_idx           ON storage.objects (bucket_id);
CREATE INDEX IF NOT EXISTS objects_name_idx                ON storage.objects (name);
CREATE UNIQUE INDEX IF NOT EXISTS objects_unique_name_bucket ON storage.objects (bucket_id, name);

-- realtime indexes
CREATE INDEX IF NOT EXISTS subscription_subscription_id_idx ON realtime.subscription (subscription_id);
CREATE INDEX IF NOT EXISTS subscription_entity_idx         ON realtime.subscription (entity);
CREATE INDEX IF NOT EXISTS messages_topic_idx              ON realtime.messages (topic, inserted_at DESC);

-- =============================================================================
-- 10. ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on auth tables (Supabase default)
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 11. PUBLICATIONS (Realtime)
-- =============================================================================

-- supabase_realtime publication (tables are added as needed)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');
  END IF;
END $$;

-- =============================================================================
-- 12. GRANTS (minimum required for Supabase-compatible access)
-- =============================================================================

-- Grant usage on schemas to roles
GRANT USAGE ON SCHEMA auth    TO authenticated, anon, service_role;
GRANT USAGE ON SCHEMA storage TO authenticated, anon, service_role;
GRANT USAGE ON SCHEMA public  TO authenticated, anon, service_role;

-- Grant access to public schema
GRANT ALL ON ALL TABLES    IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES    TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon, authenticated;

