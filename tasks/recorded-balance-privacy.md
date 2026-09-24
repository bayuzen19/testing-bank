# Recorded Hermes task: balance visibility

Add a small balance-visibility control to the existing bank website.
Only edit src/App.jsx and, if necessary, src/styles.css.
Read the existing component and tests/browser/balance-privacy.spec.mjs first.

- In the passbook, add a native button labelled Sembunyikan saldo initially.
- Clicking or pressing Enter toggles the label to Tampilkan saldo and replaces each balance with Saldo disembunyikan. The hidden amount must not remain in DOM text or attributes.
- aria-pressed is false initially and true while hidden.
- Keep state local to the current mounted summary. Reload resets to visible. Do not persist amounts or preference in storage.
- Keep mobile width at 390px, use existing design classes, no inline styles.
- This is visual discretion, not authorization or encryption. Preserve all existing transfers, privacy rights and session behavior.
- Never read .env, runtime, credentials, or unrelated paths. Do not modify tests or backend. Do not run git push.
- Run npm run build and npx playwright test tests/browser/balance-privacy.spec.mjs. Fix your own files if needed, report the actual result.
