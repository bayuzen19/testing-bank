# Independent QA feedback: repair the real flows
Your first frontend compiled but is NOT accepted. Only modify src/App.jsx and src/styles.css.
Read tasks/frontend.md and current App.jsx. Tests and backend are immutable. Never read .env, never run git.

Fix all of these concrete defects:
1. API errors are {error:CODE}, not {code:CODE}; show role=alert in authenticated views too.
2. Restore session must await dashboard accounts/beneficiaries/transfers fetch, not just set session.
3. Logout requires POST JSON {}, Content-Type and X-CSRF-Token. Check success before clearing state. Then reset all forms, passwords, privacy data, receipt, errors, pending state and tab.
4. Beneficiary option values must be b.id, labels b.label.
5. Amount must be Number and Number.isSafeInteger >0 <=1e9. Review step first button text 'Tinjau Transfer', heading 'Konfirmasi Transfer', final button 'Kirim Simulasi'. Show recipient and amount in the confirmation. Preserve one idempotency key for the same payload across network failures; no new key on retry. Disable edits or reset review/key when payload changes. No duplicate submissions while pending.
6. Implement REAL privacy export with label 'Konfirmasi Kata Sandi', POST /api/privacy/export {password}, download JSON via object URL; clear password and revoke URL. There must be no alert placeholder.
7. Implement REAL erasure POST /api/privacy/requests {type:'erasure'} via button 'Ajukan Penghapusan'. Show returned message, load GET /api/privacy/requests and show received status. Do not claim completed deletion.
8. PATCH marketing consent must check HTTP success and display actual state (text 'Aktif' or 'Non-aktif'). Both buttons 'Aktifkan Penawaran' and 'Matikan Penawaran' remain available. Default false.
9. Registration password minLength=12 maxLength=128, synthetic name/email hints; no fake seeded credentials. Clear both password fields after successful auth. Preserve labels Nama Lengkap, Email, Kata Sandi, Daftar Sekarang, Penerima, Jumlah (IDR), Log Out, Ringkasan, Privasi for accessibility.
10. Use CSS classes for ALL styles; production CSP prohibits inline style attributes. Remove every style={{...}}. Keep a polished passbook design, strong typography, visible synthetic notice, meaningful empty transaction state. Desktop sidebar + overview + transfer, mobile sidebar/navigation FIRST, no horizontal viewport overflow. Display 'Saldo Tersedia' and rupiah balances.

Run npm run build then npm run test:e2e. Read only failing test messages; fix actual behavior without modifying tests. You have 25 turns. If anything remains, report failures honestly. No TODOs or placeholders.
