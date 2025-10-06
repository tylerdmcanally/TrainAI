# TrainAI Progress Overview

_Last updated: 2024-05-18_

## 🎯 MVP Focus
We are prioritizing a clean owner ➝ employee workflow:
1. Owner signs up and lands on the correct dashboard.
2. Owner records and publishes a training (file upload, transcription, SOP generation, Mux playback).
3. Owner assigns the training to employees.
4. Employee logs in, completes the training, and progress is recorded.

Everything else (settings, mobile UX, advanced analytics, etc.) is secondary until these flows are reliable.

## ✅ Working As Expected
- Landing page and auth screens (signup, login, forgot/reset password, employee invite) using Supabase Auth & RLS.
- Background job processor (`/api/jobs/process`) downloads assets, calls OpenAI + Mux, and writes results back to Supabase.
- SOP and chat APIs now validate inputs and sanitize AI responses.
- Upload helper and training processing step align on the `/api/storage/upload` endpoint.

## ⚠️ Needs Validation / Polish
- Owner training creation wizard: we need an end-to-end run with real recording ➝ publish to verify the new pipeline.
- Owner dashboard data queries and UI should be smoke-tested after the latest auth/layout changes.
- Assignment dialogs and employee dashboards rely on legacy `any` types—functionality is there but requires manual testing.
- Employee player (Mux playback + checkpoints + progress save) must be exercised to confirm nothing regressed.

## 🔜 Upcoming Tasks
- [ ] Run through the full owner ➝ employee journey locally and note any bugs.
- [ ] Add quick validation script/tests for the job processor (mock fetch + Mux client).
- [ ] Plan lint/type cleanup in focused batches once MVP flow is green.
- [ ] Document deployment steps (Vercel cron for `/api/jobs/process`, env vars) after testing.

## 🧾 Environment Checklist
Set these in `.env.local` for local dev:
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
MUX_TOKEN_ID=
MUX_TOKEN_SECRET=
NEXT_PUBLIC_MUX_ENVIRONMENT_KEY=
RESEND_API_KEY=
BACKGROUND_JOB_TOKEN=
```
Supabase should have the latest schema and a `training-videos` storage bucket.

## 🚧 Known Gaps
- ESLint reports ~80 errors (mostly `any` usage) and ~130 warnings across legacy components.
- No automated tests yet; manual smoketests only.
- Settings pages, mobile experiences, and analytics dashboards still contain placeholder logic.

## 📌 Summary
Core infrastructure is in place. To ship the MVP confidently we must validate the four key user flows above, log any breakages, and only then move on to cleanup and advanced features.
