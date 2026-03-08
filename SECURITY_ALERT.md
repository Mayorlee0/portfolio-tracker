# Security Alert: Rotate Leaked Supabase Credentials Immediately

Credentials were shared in plain text. Treat them as compromised.

## Rotate now

In Supabase dashboard, rotate/regenerate all sensitive keys and passwords:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_JWT_SECRET`
- Database password (`POSTGRES_PASSWORD`)
- Any connection strings derived from those values

## Safe usage rules

- Only `SUPABASE_URL` and `SUPABASE_ANON_KEY` are allowed in browser code.
- Never put service role keys, secret keys, JWT secret, or DB passwords in frontend JavaScript.
- Store sensitive keys only in server-side environment variables.

## After rotation

1. Update server-side environment variables.
2. Revoke old secrets/keys.
3. Verify app sign-in and DB access still work with new keys.
