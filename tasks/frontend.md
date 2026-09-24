# Frontend acceptance contract
Implement ONLY src/main.jsx, src/App.jsx and src/styles.css for a polished React banking PoC.
Use React already installed. No component libraries, no remote assets/fonts, no storage of tokens/passwords.
The backend is already implemented. Read this contract instead of reading all backend files.
Do NOT change tests, server, package, scripts, credentials or git. Run npm run build and fix build errors.

Visual design: bank name "Muamalat", small "Banking PoC" label. Deep plum #351A3C, forest #3C725C,
warm gold #D5B48C, clean #F6F6F3 canvas, #28212C text. Georgia display headings, Segoe UI body,
tabular figures. Desktop two-column login: plum editorial area left with large heading,
right generous registration/login form. Authenticated desktop: narrow left navigation,
main account overview, transfer form at right, transaction ledger below. Mobile stacks.
One signature: account summary styled as a refined bank passbook with fine ruled lines.
No gradients, emoji, stock photos, decorative dashboards or fabricated metrics.
Visible keyboard focus, real labels, accessible buttons, reduced-motion support.

API same origin /api, fetch credentials:'same-origin'. Session cookie is HttpOnly.
After register/login response {csrf}, fetch GET /api/session:
{name,email (masked),csrf,marketing,consentVersion}.
Keep csrf in React state, send header X-CSRF-Token for authenticated mutations.
Send Content-Type:application/json and object JSON for POST/PATCH. Browser supplies Origin.
GET /api/accounts returns [{id,label,balance,maskedNumber}]; amounts integer IDR.
GET /api/beneficiaries returns [{id,label}].
GET /api/transfers returns [{id,amount,created_at,recipient,status}].
POST /api/transfers body {destination,amount}, header Idempotency-Key: crypto.randomUUID().
Only clear/change idempotency key after definitive success or changed request. Preserve it on network failure.
Result {id,status,replayed}. Refresh account/history. Require review/confirmation before submitting.
Show successful receipt and "Simulasi selesai. Tidak ada uang nyata yang dipindahkan."
Prevent repeated submits while pending. Invalid amounts rejected in UI.
Render currency with Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).

Login POST /api/auth/login {email,password}.
Registration POST /api/auth/register {name,email,password,consentVersion:'2026-09-24',marketing:false}.
Use name starting "Demo " and email starting demo with @example.test domain.
Registration password >=12 chars. Require checkbox "Saya memahami penggunaan data sintetis".
Do not preselect checkbox or marketing. No real NIK/phone collection.
Allow toggle between Login and "Buka akun demo"; default registration.
Session restore GET /api/session on mount; unauthenticated goes to landing, no infinite requests.
Logout POST /api/auth/logout {} then clear ALL personal React state.

Tabs "Ringkasan" and "Privasi".
Privacy: show notice "Data sintetis, bukan layanan perbankan resmi. Tidak ada KYC atau pembayaran nyata."
Show masked email, notice version. PATCH /api/privacy/consent {marketing:boolean}.
POST /api/privacy/export {password} requires reauthentication; download JSON blob via link,
then revokeObjectURL and clear password. GET /api/privacy/requests returns own records.
POST /api/privacy/requests {type:'erasure'} returns 202 and message that verification and
retention review is required. Never claim data immediately deleted.
Explain name/email encrypted at rest, limited account display, no marketing by default.
Display errors as short human text mapping API codes (INSUFFICIENT_FUNDS, INVALID_CREDENTIALS,
SYNTHETIC_IDENTITY_REQUIRED, CSRF_REJECTED), not raw stacks. Preserve inputs on failure.

Need output files complete and runnable, no TODO placeholders.
