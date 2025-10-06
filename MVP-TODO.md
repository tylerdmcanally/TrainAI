# MVP Task Tracker

## Blocking Workflows
1. **Owner training creation**
   - [ ] Record a sample session and ensure `/api/storage/upload` accepts the blob.
   - [ ] Verify transcription (`/api/training/transcribe`), SOP generation (`/api/training/generate-sop`), and Mux upload succeed end to end.
   - [ ] Confirm publish stores mux IDs + AI artifacts so the training appears in dashboards.

2. **Assignment & employee completion**
   - [ ] Assign a freshly published training to a test employee and confirm email copy if configured.
   - [ ] Employee logs in, sees the assignment, plays the video, passes checkpoints, and completion status flips to `completed`.
   - [ ] Progress saves (`/api/training/save-progress`) without errors.

3. **Background job processing**
   - [ ] Manually trigger `/api/jobs/process` with `BACKGROUND_JOB_TOKEN` to drain queued jobs in dev.
   - [ ] Add a minimal automated test (mock Mux/fetch) to catch regressions in the processor helpers.

## Once Core Flow Is Stable
- Address lint/type errors (owner/employee dashboards, training players, settings, scripts).
- Automate the cron hitting `/api/jobs/process` and add logging/alerts.
- Add integration or scripted smoke tests for training creation + playback.
- Circle back to settings/mobile UX polish.

Update this list after each validation run so we always know the next priority.
