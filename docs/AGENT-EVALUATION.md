# Evaluasi agent lokal — 24 September 2026

Fokus produk: Hermes sebagai asisten coding lokal dengan reviewer dan quality gates.
Website ini adalah workload evaluasi, bukan bukti agent siap bekerja otonom.

| Percobaan | Bukti pengamatan | Kesimpulan |
|---|---|---|
| Qwen2.5 14B | Batas context model 32k, runtime Hermes meminta minimum 64k | Tidak kompatibel pada konfigurasi ini |
| Gemma4 8B, context 64k | Kandidat modul privasi gagal sintaks/implementasi | Gagal |
| Gemma4 26B, privasi | 7/7 tes awal; setelah tes diperluas dan feedback, 9/9 | Berhasil dengan bantuan reviewer; tambahan validasi canonical Base64 diperbaiki evaluator |
| Gemma4 26B, frontend awal | Build lolos, browser 1/4 | Gagal acceptance |
| Gemma4 26B, perbaikan frontend | Duplikasi fungsi/JSX; build gagal | Gagal, percobaan lanjutan dihentikan |
| Qwen3-Coder 30B, 64k | 12m28s, 36 tool calls, browser 0/4 meski model mengklaim sesuai | Gagal acceptance |
| Frontend diperbaiki evaluator | Alur sesi, retry idempotency, privasi, UI dan pemisahan komponen diperbaiki | Hasil reviewer-assisted; gunakan bukti CI pada commit rilis |
| Review AI PR #1 | Gemma4 26B menemukan satu IDOR severity high pada fixture terisolasi setelah push GitHub | Satu kasus positif; belum mengukur recall/false positives |
| Review AI PR #2, scope app.mjs saja | Model menduga race tanpa melihat schema | Reviewer menolak temuan ini: transaksi sama, source row lock, atomic destination UPDATE, UNIQUE(user_id,idem_key), satu akun per user dan penerima tetap. Tes konkurensi/replay mendukung adjudikasi. SQL context ditambahkan untuk percobaan berikutnya. |

## Atribusi
Hermes/model lokal membuat kandidat modul privacy dan frontend. Evaluator (Codex)
menulis backend integrasi, tes independen, DevOps, materi evaluasi, serta perbaikan
frontend dan validasi envelope kriptografi. Jangan memasarkan website final sebagai
hasil end-to-end otonom Hermes. Model inference Hermes dan AI review menggunakan
Ollama loopback; aktivitas evaluator dalam sesi ini bukan inference Hermes lokal.

## Perbaikan produk yang diterapkan
- Preflight memverifikasi model terpasang, context dan endpoint loopback; cloud fallback ditolak.
- Tujuh skill bank untuk engineering, QA, review, pipeline, DevOps dan dokumentasi disesuaikan dengan repository.
- Kandidat dan tes disimpan terpisah; klaim model tidak menjadi verdict.
- `scripts/agent_acceptance.py` menjalankan syntax, build dan browser acceptance,
  merekam fingerprint sumber/tes, provenance kandidat dan status tiap gate.
- GitHub review terikat head SHA, memeriksa perubahan SHA setelah inference, dan
  mencatat file yang tidak masuk scope; patch terlalu besar ditolak, bukan dipotong diam-diam.
- Release documentation hanya dibuat setelah semua gate aktual lulus.

## Keputusan komersial
Layak didemokan sebagai engineering PoC dan kandidat pilot dengan supervisi.
Belum cukup bukti untuk menjual klaim setara Copilot atau agent otonom siap produksi.
Sebelum acceptance komersial: benchmark 30 tugas representatif × 3 pengulangan,
ukur keberhasilan sesudah maksimal dua perbaikan, latensi, biaya, false positives,
dan kegagalan keamanan. Bandingkan Copilot pada tugas, waktu dan rubric yang sama.
Target dan ukuran hardware dalam ARCHITECTURE.md adalah usulan, bukan hasil benchmark.
