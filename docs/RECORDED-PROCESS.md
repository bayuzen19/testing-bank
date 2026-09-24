# Demonstrasi proses Hermes: kontrol tampilan saldo

Rekaman baru menunjukkan prompt di antarmuka Hermes, pembacaan task dan tes,
generasi kode, feedback, verifikasi, push GitHub, review AI lokal dan CI.
Ini perubahan fitur pada aplikasi yang sebelumnya sudah dibantu evaluator.

## Prompt dan model

Prompt: "Tambahkan tombol sembunyikan/tampilkan saldo pada website bank ini.
Ikuti tasks/recorded-balance-privacy.md dan tesnya. Ubah hanya App.jsx/CSS.
Jalankan build dan tes browser, jangan ubah tes. Data sintetis, model lokal,
tanpa git push."

Hermes 0.18.2, Gemma4 26B, context runtime 65.536, Ollama loopback.
Session: `20260924_212029_aa6698`. Model digest:
`08ae7ec1744bd7f451c4a530afb39d2673ad9d07a8369b8a33a3613b41212a68`.

## Alur dan atribusi

Tes acceptance ditulis evaluator sebelum agent dan gagal pada baseline karena
tombol belum tersedia. Hermes menghasilkan state React, tombol native,
aria-pressed dan teks saldo kondisional. Kandidat JSX awal sempat lolos tes fitur.
Penulisan ulang CSS berikutnya merusak build. Reviewer mengirim feedback untuk
memulihkan CSS dan membatasi perubahan. Putaran kedua tetap mengalami error tool
dan dihentikan. Bukan hasil agent otonom yang lulus tanpa bantuan.

Evaluator mengambil BankSummary dari keluaran write_file asli, mempertahankan
PrivacyView dan CSS baseline, merapikan format, memakai pembaruan state fungsional,
serta menambahkan gaya fokus dan ukuran teks yang terbaca pada mobile.
Tes, workflow, publikasi branch dan materi rekaman dikerjakan evaluator.
Tes sementara saat file masih berubah tidak menjadi bukti rilis. Acceptance final
berjalan pada build produksi yang stabil, lalu diulang oleh GitHub CI.

## Perilaku fitur

Tombol Sembunyikan saldo mengganti angka saldo dengan Saldo disembunyikan dan
aria-pressed=true. Tombol Tampilkan saldo mengembalikan angka. State hanya berada
di komponen Ringkasan dan reset ketika komponen dimuat ulang. Tombol bekerja
dengan keyboard, tanpa menyimpan saldo atau preferensi di localStorage.

Ini kontrol tampilan untuk mengurangi paparan visual, bukan enkripsi atau
otorisasi. API tetap mengirim saldo kepada pemilik akun yang terautentikasi.
Menu lain, riwayat transaksi dan respons jaringan berada di luar scope masking ini.
Data tetap sintetis. PDP/PII dan batas produksi dijelaskan di COMPLIANCE.md.
