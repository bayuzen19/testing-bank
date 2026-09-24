# PDP, PII dan kontrol perbankan

Dokumen desain PoC, bukan pendapat hukum, sertifikasi atau pernyataan aplikasi patuh.
Data sintetis saja. Bayuzen Ahmad adalah pemilik PoC; DPO, pengendali data, vendor dan
otoritas persetujuan produksi harus ditentukan dalam kontrak bank.

## Peta data

| Data | Perlakuan PoC | Batas yang masih ada |
|---|---|---|
| Nama/email sintetis | Validasi domain contoh, AES-256-GCM, lookup HMAC terpisah | KMS, rotasi, retensi dan akses operator belum produksi |
| Password | Salt acak + scrypt; tidak diekspor | SSO/MFA dan kebijakan identitas bank belum terhubung |
| Session | Token opaque, hash di DB, HttpOnly, SameSite, CSRF, logout revoke | HTTPS/Secure wajib pada deployment produksi |
| Rekening/transfer | Tampilan tersamar, ownership, transaksi, idempotency | Nomor internal API dan audit tetap data terbatas |
| Audit actor | Hash identitas, event tanpa raw PII | Pseudonimisasi bukan anonimisasi; perlu retensi dan pembatasan akses |
| Source/prompt agent | Model loopback; fixture sintetis | Hermes di laptop belum sandbox OS; riwayat prompt perlu kebijakan retensi |
| Patch GitHub | Repo publik PoC disetujui, reviewer hanya baca | Source bank asli tidak boleh masuk repo publik |

## Matriks kontrol dan bukti

| Kebutuhan | Implementasi / bukti | Tindakan sebelum produksi |
|---|---|---|
| Pembatasan tujuan dan minimisasi | Tidak mengumpulkan NIK, telepon, KYC; hanya identitas demo | Pemetaan data, tujuan, dasar pemrosesan dan perjanjian pengendali/prosesor |
| Persetujuan yang jelas | Marketing default false; perubahan direkam dengan versi dan status | Pisahkan consent marketing dari dasar pemrosesan rekening yang sesuai hukum |
| Hak akses dan pemenuhan permintaan | Export profil dengan reautentikasi; permintaan erasure berstatus received | Full access/correction/retention workflow, verifikasi pemohon, tracking SLA, keputusan dan fulfillment |
| Kerahasiaan dan integritas | Enkripsi, masking, CSRF, ownership, password hash; tes negatif | TLS/mTLS, KMS/HSM, RBAC/SSO, key rotation, hardening DB |
| Rekaman pemrosesan / audit | Event dan reference, log teredaksi | ROPA, SIEM, append-only audit, integritas dan retensi terukur |
| Dampak dan insiden | Kasus risiko serta pembatasan PoC terdokumentasi | DPIA jika kriteria terpenuhi; prosedur deteksi, eskalasi dan notifikasi insiden |
| Pihak ketiga / lintas batas | Dataflow memisahkan inference lokal dan GitHub | Evaluasi lokasi data, transfer, kontrak, outsourcing dan persetujuan yang diperlukan |
| Governance TI bank | CI gates, reviewer, source fingerprint, deployment terpisah | Pemetaan lengkap POJK/PADK, approval bank, BCM/DR, vendor risk dan assurance independen |

## Dasar regulasi yang diperiksa

UU 27/2022 membedakan dasar pemrosesan, hak subjek data dan kewajiban pengendali.
Art.20: tentukan dasar yang tepat; consent bukan satu-satunya dasar. Art.31: rekaman
pemrosesan. Art.34: penilaian dampak untuk pemrosesan berisiko tinggi. Art.46:
pemberitahuan kegagalan pelindungan paling lambat 3x24 jam sesuai ketentuan.
Art.56: evaluasi persyaratan transfer lintas negara; inferensi lokal saja tidak menutup
isu source, telemetry, backup atau GitHub. Penentuan DPO harus mempertimbangkan
Art.53 dan perkembangan putusan MK 151/PUU-XXII/2024, bukan teks lama saja.
[UU 27/2022 dan catatan status](https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022)

POJK 11/POJK.03/2022 mengatur penyelenggaraan TI bank umum. PADK 1/2026 berlaku
1 Maret 2026; gunakan ketentuan terbaru dalam pemetaan governance, risiko, pihak
ketiga dan arsitektur. SEOJK 29/SEOJK.03/2022 menjadi rujukan ketahanan/keamanan
siber bank. Matriks ini perlu diperiksa legal/compliance bank per pasal dan proses.
[POJK 11](https://ojk.go.id/en/regulasi/Pages/Implementation-of-Information-Technology-by-Commercial-Banks.aspx),
[PADK 1/2026](https://ojk.go.id/id/regulasi/Pages/PADK-1-Tahun-2026-Penyelenggaraan-Teknologi-Informasi-oleh-Bank-Umum.aspx),
[SEOJK 29](https://ojk.go.id/id/regulasi/Documents/Pages/Ketahanan-dan-Keamanan-Siber-Bagi-Bank-Umum/SEOJK%2029%20SEOJK.03%202022.pdf)

## Gate operasional yang belum dibuktikan di laptop

SSO/MFA, OS sandbox, egress enforcement, review hotspot Sonar oleh security engineer,
pentest independen, backup/restore, RTO/RPO, HA/DR, incident drill, approval legal,
retention schedule, pemenuhan hak end-to-end dan deployment cluster milik bank.
Green CI tidak otomatis menutup daftar ini. Website PoC tidak boleh menerima data
nasabah sebenarnya atau diposisikan sebagai layanan transfer riil.
