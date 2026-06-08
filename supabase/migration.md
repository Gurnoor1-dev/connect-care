# BreatheRise — Complete Setup & Migration Guide

Everything you need to go from zero to a fully running BreatheRise instance.

---

## Step 1 — Create a Supabase project

1. Go to https://supabase.com → **New project**.
2. Pick a strong database password and save it somewhere safe.
3. Once the project is ready, go to **Project Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`
   - **service_role key** → used only by Edge Functions as `SUPABASE_SERVICE_ROLE_KEY` (Supabase injects this automatically — never put it in `.env`)

Create `.env` at the project root:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## Step 2 — Run the database migration

Open **Supabase → SQL Editor** and run the files in order:

### `db/001_initial.sql`

Paste the entire file and click **Run**. This creates:

| Object | What it does |
|--------|-------------|
| `pgcrypto`, `uuid-ossp` extensions | Random bytes for invite tokens |
| `app_role` enum | `customer`, `specialist`, `admin` |
| `appointment_status` enum | `pending_payment`, `confirmed`, `completed`, `cancelled`, `no_show` |
| `invitation_status` enum | `pending`, `accepted`, `expired`, `revoked` |
| `profiles` table | Mirrors `auth.users` — created by trigger on signup |
| `user_roles` table | Separate role store — never read roles from `profiles` |
| `has_role()` function | `SECURITY DEFINER` helper — use this in all RLS policies |
| `specialist_profiles` table | Public-facing specialist info |
| `specialist_tiers` table | Pricing tiers per specialist |
| `specialist_availability` table | Weekly recurring availability slots |
| `appointments` table | Core booking table with PayU + Daily.co fields |
| `specialist_invitations` table | Invite-only specialist onboarding |
| `handle_new_user` trigger | Auto-creates profile + assigns `customer` role on signup |
| `stamp_customer_name` trigger | Denormalises customer name onto each appointment |
| `set_updated_at` triggers | Auto-stamps `updated_at` on profiles, specialist_profiles, appointments |
| All RLS policies | Row-level security for every table |
| Performance indexes | On all foreign keys, scheduled_at, status, payu_txn_id, token |

### `db/002_promote_admin.sql`

**After your first signup**, open this file, replace `YOUR@EMAIL.com` with your email, then run it in the SQL Editor. Sign out and back in — you'll land on `/dashboard/admin`.

---

## Step 3 — Authentication setup

### Email + OTP

In Supabase → **Authentication → Providers → Email**:

- ✅ Enable Email provider
- Toggle **"Confirm email"** ON
- Set **OTP length** to `6`
- Set **OTP expiry** to `600` (10 minutes)
- Go to **Authentication → Email Templates → Confirm signup**
- Make sure the body contains `{{ .Token }}` so users get the 6-digit code (the default template uses `{{ .ConfirmationURL }}` — replace or add the token line)

The app flow: `Signup` → `supabase.auth.signUp()` → redirect to `/verify-otp?email=...` → user enters the 6-digit code → `supabase.auth.verifyOtp({ type: 'email' })` → redirect to `/dashboard`.

### Google OAuth

1. Go to https://console.cloud.google.com → **APIs & Services → Credentials → Create OAuth Client ID** (Web application)
2. Under **Authorized redirect URIs** add: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
3. Copy the **Client ID** and **Client Secret**
4. In Supabase → **Authentication → Providers → Google** → paste both → Save
5. In Supabase → **Authentication → URL Configuration**:
   - Site URL: `http://localhost:8080` (dev) or your prod URL
   - Add `http://localhost:8080/auth/callback` and `https://yourdomain.com/auth/callback` to the redirect allow-list

### Facebook OAuth

1. Go to https://developers.facebook.com → **Create App → Consumer**
2. Add product **Facebook Login**
3. Under **Valid OAuth Redirect URIs** add: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
4. Copy **App ID** and **App Secret**
5. In Supabase → **Authentication → Providers → Facebook** → paste both → Save

---

## Step 4 — Edge Functions

There are **5 Edge Functions** in `supabase/functions/`. Deploy them all with the Supabase CLI.

### Install & link the CLI

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR-PROJECT-REF
```

Your project ref is the string in your Supabase dashboard URL: `https://supabase.com/dashboard/project/YOUR-PROJECT-REF`

### Deploy all functions

```bash
# Standard functions (JWT verification on)
supabase functions deploy payu-initiate
supabase functions deploy daily-token
supabase functions deploy invite-specialist

# No JWT — these receive unauthenticated requests
supabase functions deploy payu-webhook --no-verify-jwt
supabase functions deploy accept-specialist-invite --no-verify-jwt
```

`--no-verify-jwt` is required because:
- `payu-webhook` receives server-to-server POST requests from PayU (no Supabase JWT)
- `accept-specialist-invite` is called before the invitee has an account

### Set function secrets

```bash
supabase secrets set \
  APP_BASE_URL=https://yourdomain.com \
  PAYU_MERCHANT_KEY=your_payu_key \
  PAYU_MERCHANT_SALT=your_payu_salt \
  PAYU_MODE=test \
  DAILY_API_KEY=your_daily_api_key
```

**Secrets injected automatically by Supabase** (do NOT set these yourself):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Edge Function reference

| Function | Trigger | JWT | What it does |
|----------|---------|-----|-------------|
| `payu-initiate` | Customer clicks "Continue to payment" | ✅ Required | Creates appointment, builds PayU hash, returns self-submitting HTML form |
| `payu-webhook` | PayU server-to-server POST after payment | ❌ None | Verifies reverse hash, flips appointment to `confirmed` or `cancelled` |
| `daily-token` | Customer/specialist clicks "Join call" | ✅ Required | Checks 5-min window + confirmed status, lazily creates Daily.co room, returns meeting token |
| `invite-specialist` | Admin submits invite form | ✅ Required (admin) | Inserts `specialist_invitations` row, returns invite URL |
| `accept-specialist-invite` | Specialist opens `/invite/:token` and submits | ❌ None | Validates token, creates auth user, assigns `specialist` role, seeds `specialist_profiles` |

---

## Step 5 — PayU hosted checkout

1. Sign up at https://payu.in → **Merchant Dashboard → Integration Details** for test credentials
2. Set secrets as shown above (`PAYU_MERCHANT_KEY`, `PAYU_MERCHANT_SALT`, `PAYU_MODE=test`)
3. In the PayU dashboard → **Webhooks** add: `https://YOUR-PROJECT.functions.supabase.co/payu-webhook`
4. Payment flow:
   - Customer fills booking form → clicks "Continue to payment"
   - Frontend calls `payu-initiate` edge function
   - Function returns an auto-submit HTML form
   - App injects the form into the DOM and submits it to PayU's hosted page
   - User completes payment on PayU's page
   - PayU redirects to `/payment/success` or `/payment/failure`
   - PayU also POSTs to `payu-webhook` which verifies the hash and updates appointment status
5. To go live: change `PAYU_MODE=live`

---

## Step 6 — Daily.co video calls

1. Sign up at https://daily.co → **Developers → API Keys → Create key**
2. Set `DAILY_API_KEY` secret (see above)
3. The "Join call" button appears client-side only when `scheduled_at` is ≤ 5 minutes away and status is `confirmed`
4. The `daily-token` function re-enforces this window server-side, creates the Daily.co room lazily on the first join, and issues a meeting token
5. Specialists receive `is_owner: true` in their token (full room controls)
6. Specialists see a notepad alongside the video. Saving writes to `appointments.session_notes` and `notes_updated_at`
7. Past notes are browsable at `/dashboard/specialist/patients`

---

## Step 7 — Specialist invitations

Specialists **cannot self-register**. The invite-only flow:

1. Admin opens `/dashboard/admin/invitations` → enters email + optional name → clicks "Send invite"
2. `invite-specialist` edge function creates a `specialist_invitations` row with a random 64-char hex token
3. The invite URL is returned as `inviteUrl` — you can copy it from the admin table ("Copy link" button) and send it manually, or wire up Resend/Postmark in `supabase/functions/invite-specialist/index.ts`
4. Specialist opens `/invite/:token` → enters name + password → submits
5. `accept-specialist-invite` edge function:
   - Validates token (must be `pending` and not expired)
   - Marks invite `accepted` (so the `handle_new_user` trigger skips the `customer` role)
   - Creates the auth user via `admin.auth.admin.createUser` with `email_confirm: true`
   - Assigns `specialist` role in `user_roles`
   - Seeds a row in `specialist_profiles`
6. The frontend signs the specialist in automatically and redirects to `/dashboard/specialist`

---

## Step 8 — Role model

| Role | How assigned | Dashboard |
|------|-------------|-----------|
| `customer` | Auto on signup (trigger) | `/dashboard/customer` |
| `specialist` | Only via `accept-specialist-invite` function | `/dashboard/specialist` |
| `admin` | Manually via `002_promote_admin.sql` | `/dashboard/admin` |

**Never check roles from `profiles`**. Always use `public.has_role(uid, 'admin')` (SECURITY DEFINER) or query `user_roles` directly.

---

## Step 9 — Environment variables summary

### Frontend (`.env` at project root)

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Edge Functions (via `supabase secrets set`)

```
APP_BASE_URL          Your production domain, e.g. https://breatherise.com
PAYU_MERCHANT_KEY     From PayU merchant dashboard
PAYU_MERCHANT_SALT    From PayU merchant dashboard
PAYU_MODE             "test" or "live"
DAILY_API_KEY         From daily.co developer dashboard
```

Auto-injected by Supabase (do NOT set):
```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

---

## Step 10 — Local development

```bash
bun install
bun run dev
# App runs at http://localhost:8080
```

For Edge Functions locally:

```bash
supabase start          # starts local Supabase stack
supabase functions serve --env-file .env.local
```

---

## Database schema summary

```
auth.users (Supabase managed)
  │
  ├─ profiles (1:1) — full_name, email, notifications_opt_in
  ├─ user_roles (1:many) — role enum per user
  │
  ├─ specialist_profiles (1:1, specialist users only)
  │    ├─ specialist_tiers (1:many) — pricing
  │    └─ specialist_availability (1:many) — weekly slots
  │
  ├─ appointments (many:many via customer_id + specialist_id)
  │    └─ PayU + Daily.co fields, session_notes, customer_name (denorm)
  │
  └─ specialist_invitations — invite tokens, status, expiry
```

---

## File structure reference

```
src/
  pages/
    Index, HowItWorks, Specialists, About, Contact, NotFound
    auth/
      Login, Signup, VerifyOtp, ForgotPassword, AuthCallback, AcceptInvite
    dashboard/
      DashboardRedirect        ← role-based redirect
      customer/
        Overview, Appointments, BookAppointment, VideoCall
      specialist/
        Overview, Availability, Tiers, Profile, Patients, VideoCall
      admin/
        Overview, Invitations, Users
    payment/
      Success, Failure
  components/
    layout/   PublicLayout, DashboardLayout
    dashboard/ VideoCallScreen
    ui/        (shadcn/ui components)
    Logo, ThemeProvider, ThemeToggle, ProtectedRoute
  contexts/
    AuthContext              ← user, role, loading, signOut, refreshRole
  integrations/supabase/
    client.ts                ← createClient + AppRole type

db/
  001_initial.sql            ← run first in SQL editor
  002_promote_admin.sql      ← run after first signup

supabase/functions/
  payu-initiate/index.ts
  payu-webhook/index.ts
  daily-token/index.ts
  invite-specialist/index.ts
  accept-specialist-invite/index.ts
```

---

## Checklist

- [ ] Supabase project created
- [ ] `.env` file created with URL + anon key
- [ ] `001_initial.sql` executed in SQL editor
- [ ] `002_promote_admin.sql` executed after first signup (with your email)
- [ ] Email OTP enabled in Auth settings, template updated with `{{ .Token }}`
- [ ] Google OAuth configured (optional)
- [ ] Facebook OAuth configured (optional)
- [ ] Supabase CLI installed and project linked
- [ ] All 5 Edge Functions deployed
- [ ] All function secrets set
- [ ] PayU test credentials configured
- [ ] PayU webhook URL registered in PayU dashboard
- [ ] Daily.co API key configured
- [ ] App running at localhost:8080 and login/signup tested
- [ ] Specialist invitation flow tested end-to-end

---

Breathe deeply. Ship higher.
