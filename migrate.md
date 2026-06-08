# BreatheRise — Setup Guide

This project is a Vite + React Router DOM app (`src/pages`) talking to **your own Supabase project**.
Below is everything you need to bring it up end-to-end.

---

## 1. Create a Supabase project

1. Go to https://supabase.com → New project.
2. Copy the **Project URL** and **anon public key** from Project Settings → API.
3. Also copy the **service_role key** (used only inside Edge Functions, never in the browser).

Create a `.env` at the project root:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 2. Apply the database schema

Open Supabase **SQL editor** and run the file `db/001_initial.sql` (paste the whole file, click Run).

It creates:

- `profiles`, `user_roles` (+ `app_role` enum, `has_role()` helper)
- `specialist_profiles`, `specialist_tiers`, `specialist_availability`
- `appointments` (with PayU + Daily.co + notes fields), `appointment_status` enum
- `specialist_invitations` (+ `invitation_status` enum)
- Row-Level-Security policies for every table
- Triggers:
  - `on_auth_user_created` → creates a profile and assigns the default `customer` role on signup (skips role assignment if the email matches an `accepted` specialist invite so the edge function can set `specialist`).
  - `appointments_stamp_customer` → copies the customer's name onto each appointment for the specialist's UI.

Roles model: roles live in their own `user_roles` table to prevent privilege escalation. Always check with `public.has_role(uid, 'admin')` (SECURITY DEFINER) — never read roles from `profiles`.

---

## 3. Promote yourself to admin

After your first signup, run in SQL editor:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'YOUR@EMAIL.com'
on conflict do nothing;
```

Sign out / back in; you'll land on `/dashboard/admin`.

---

## 4. Email + OTP at signup

Supabase → **Authentication → Providers → Email**:

- ✅ Enable Email provider
- Toggle **"Confirm email"** ON
- Set **"OTP length"** to `6` and **"OTP expiry"** to `600` (10 min)
- Email Templates → **Confirm signup** → make sure the body includes `{{ .Token }}` so the user gets the 6-digit code (the template ships with `{{ .ConfirmationURL }}` by default; replace or add the token).

The frontend calls `supabase.auth.signUp(...)` and then redirects to `/verify-otp?email=...` where the user enters the 6-digit code (`supabase.auth.verifyOtp({ type: 'email' })`).

---

## 5. Google OAuth

Supabase → **Authentication → Providers → Google**:

1. In Google Cloud Console create an **OAuth Client ID (Web application)**.
2. Authorized redirect URI: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
3. Paste the client ID + secret into Supabase Google provider settings → Save.
4. In Supabase → **Authentication → URL Configuration**, add your site URL (e.g. `http://localhost:8080`, plus your prod URL) and add `*/auth/callback` to redirect allow-list.

---

## 6. Facebook / Meta OAuth

Supabase → **Authentication → Providers → Facebook**:

1. Create an app at https://developers.facebook.com → Add product **Facebook Login**.
2. Valid OAuth Redirect URI: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
3. Copy App ID + App Secret into Supabase Facebook provider → Save.

---

## 7. Browser notifications for reminders

The signup page asks for `Notification.requestPermission()` when the user opts in. To actually deliver reminders, schedule a cron job (Supabase → **Database → Cron**) hitting an Edge Function that queries appointments starting in ~15 min and sends Web Push (or email via Resend). Not included in this scaffold — wire it in when you're ready.

---

## 8. Edge Functions

Five functions live in `supabase/functions/`. Deploy with the Supabase CLI:

```bash
npx supabase link --project-ref YOUR-PROJECT-REF
npx supabase functions deploy payu-initiate
npx supabase functions deploy payu-webhook --no-verify-jwt
npx supabase functions deploy daily-token
npx supabase functions deploy invite-specialist
npx supabase functions deploy accept-specialist-invite --no-verify-jwt
```

`--no-verify-jwt` is required for `payu-webhook` (PayU server-to-server posts have no JWT) and `accept-specialist-invite` (the invitee isn't logged in yet).

Set function secrets:

```bash
npx supabase secrets set \
  APP_BASE_URL=https://yourdomain.com \
  PAYU_MERCHANT_KEY=xxxx \
  PAYU_MERCHANT_SALT=xxxx \
  PAYU_MODE=test \
  DAILY_API_KEY=xxxx
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected by Supabase automatically.

---

## 9. PayU hosted checkout

1. Get test credentials at https://payu.in/ (Merchant Dashboard → Integration Details).
2. Set `PAYU_MERCHANT_KEY`, `PAYU_MERCHANT_SALT`, `PAYU_MODE` (`test` or `live`) as secrets above.
3. In PayU dashboard → **Webhooks** add: `https://YOUR-PROJECT.functions.supabase.co/payu-webhook`
4. Booking flow: customer clicks "Continue to payment" → frontend calls `payu-initiate` → receives an auto-submit HTML form which POSTs to PayU's hosted page → user pays → PayU redirects to `/payment/success` or `/payment/failure` and also POSTs to `payu-webhook` (which verifies the reverse hash and flips the appointment to `confirmed`).

---

## 10. Daily.co video calls

1. Sign up at https://daily.co → **Developers → Create API key** → set as `DAILY_API_KEY`.
2. The "Join call" button is enabled **client-side** only when `scheduled_at` is ≤ 5 minutes away and the appointment status is `confirmed`. The `daily-token` Edge Function re-enforces the same window server-side, creates the room lazily on first join, and issues a meeting token (`is_owner: true` for specialists).
3. Specialists get a side notepad. Saving writes to `appointments.session_notes` and `notes_updated_at`. They can browse all past notes at `/dashboard/specialist/patients`.

---

## 11. Inviting specialists

Specialists cannot self-signup. Admin flow:

1. Admin opens **Dashboard → Specialist invites** and submits email + name.
2. Edge function `invite-specialist` creates a `specialist_invitations` row with a random `token` and returns the URL `/invite/<token>`.
3. (Email delivery is up to you — add Resend in `invite-specialist/index.ts`; right now you can "Copy link" from the admin table and send manually.)
4. Specialist opens the link → `/invite/:token` → sets name + password → `accept-specialist-invite` Edge Function: marks invite accepted, creates the auth user (auto-confirmed), assigns the `specialist` role, and seeds a `specialist_profiles` row.
5. They're auto-signed-in and land on `/dashboard/specialist` to fill in tiers, availability and profile, then toggle "Publish".

---

## 12. Theme

The theme is built from the BreatheRise logo palette (deep blue + teal) in `src/index.css`.
The header has a system/light/dark toggle (defaults to system). State is persisted under `breatherise-theme`.

---

## 13. Local dev

```bash
bun install
bun run dev
```

App runs at http://localhost:8080.

---

## Project map

```
src/
  pages/
    Index, HowItWorks, Specialists, About, Contact, NotFound
    auth/   Login, Signup, VerifyOtp, ForgotPassword, AuthCallback, AcceptInvite
    dashboard/
      customer/    Overview, Appointments, BookAppointment, VideoCall
      specialist/  Overview, Availability, Tiers, Profile, Patients, VideoCall
      admin/       Overview, Invitations, Users
    payment/  Success, Failure
  components/  layout/, dashboard/, Logo, ThemeToggle, ThemeProvider, ProtectedRoute, ui/*
  contexts/    AuthContext
  integrations/supabase/  client.ts

db/001_initial.sql        ← run in Supabase SQL editor
supabase/functions/       ← deploy with supabase CLI
```

That's it. Breathe deeply. Ship higher.
