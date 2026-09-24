# Estimasi penawaran - bukan quotation vendor

Disusun untuk Bayuzen Ahmad, 24 September 2026. Semua angka rupiah di bawah adalah
asumsi anggaran/jasa usulan, bukan harga pasar terverifikasi atau komitmen kontrak.
Nilai jual: integrasi agent lokal, skill bank, QA, deployment, evaluasi dan dukungan.
Hermes upstream tetap diakui; bukan klaim menjual lisensi eksklusif engine Hermes.

## Paket yang dapat dibahas dengan klien

| Komponen | PoC evaluasi | Pilot 10 developer | Rollout 20 developer |
|---|---:|---:|---:|
| Implementasi sekali bayar | Rp49.000.000 | Rp105.000.000 | Rp210.000.000 |
| Anggaran infrastruktur sekali bayar | Pakai perangkat tersedia | Rp70.000.000 | Rp180.000.000 |
| Layanan platform dan dukungan / bulan | Tidak termasuk | Rp12.000.000 | Rp25.000.000 |
| Cadangan operasi infrastruktur / bulan | Tidak termasuk | Rp1.000.000 | Rp3.000.000 |
| Estimasi tahun pertama | Rp49.000.000 | Rp331.000.000 | Rp726.000.000 |

Rumus pilot: 105 + 70 + 12 x (12 + 1) = Rp331 juta.
Rumus rollout: 210 + 180 + 12 x (25 + 3) = Rp726 juta.
Tidak termasuk PPN/pajak, lisensi GitHub enterprise, Sonar berbayar, perangkat jaringan,
SOC 24x7, DR site, pentest independen, HSM, perjalanan dan integrasi core banking.

## Dasar pekerjaan dan kapasitas

- PoC: 140 jam x Rp350.000 = Rp49 juta; 4 minggu estimasi, synthetic benchmark,
  integrasi satu repo, demo CI/review, dokumentasi serta satu sesi serah terima.
- Pilot: 300 jam x Rp350.000 = Rp105 juta; estimasi 6-8 minggu, satu environment,
  maksimal 10 pengguna terdaftar, satu sesi generasi aktif, SSO/runner internal,
  baseline 30 tugas dan handover. Jadwal tergantung akses jaringan serta security review.
- Rollout: 600 jam x Rp350.000 = Rp210 juta; estimasi 10-12 minggu, dua sesi generasi
  aktif sebagai target sizing awal, staging/production dan integrasi audit.
- Layanan pilot Rp12 juta/bulan: pemeliharaan konfigurasi/skill, evaluasi regresi
  bulanan dan maksimal 16 jam dukungan jam kerja. Tidak menjanjikan uptime 24x7.
- Layanan rollout Rp25 juta/bulan: maksimal 32 jam dukungan jam kerja, release
  terjadwal dan evaluasi kualitas. SLA produksi ditentukan sesudah sizing dan pilot.
- Anggaran pilot Rp70 juta: asumsi satu workstation inference dengan GPU 32 GB,
  RAM 128 GB, NVMe 2 TB dan alokasi CI/Sonar pada infrastruktur internal tersedia.
  Jika CI/Kubernetes belum tersedia, perlu BoM/quotation terpisah.
- Anggaran rollout Rp180 juta: asumsi dua host inference plus storage/backup awal;
  belum merupakan rancangan HA/DR atau harga hardware dari supplier.

Laptop uji saat ini memakai GPU 16 GB; model besar dapat offload ke CPU. Jangan
menjanjikan throughput atau jumlah sesi simultan dari ukuran model saja. Ukur latency,
RAM/VRAM, panjang konteks dan hasil tugas pada perangkat target sebelum membeli.
Inferensi model lokal tidak menimbulkan tagihan API per token; listrik, hardware,
operasi, dukungan dan hak lisensi masing-masing komponen tetap perlu diperhitungkan.

## Lisensi dan pembelian pihak ketiga

- Hermes: MIT; pertahankan atribusi dan notice distribusi. Komponen tambahan tetap
  memerlukan inventaris lisensi/SBOM. [Upstream](https://github.com/NousResearch/hermes-agent)
- Qwen3-Coder 30B: model card mencantumkan Apache 2.0; simpan versi/digest dan
  notice. [Model card](https://huggingface.co/Qwen/Qwen3-Coder-30B-A3B-Instruct)
- Gemma: lisensi/terms Gemma tersendiri; bukan Apache 2.0. Tinjau syarat distribusi
  dan penggunaan sebelum bundling. [Gemma terms](https://ai.google.dev/gemma/terms)
- Sonar Community tersedia tanpa biaya lisensi; jangan menganggap semua versi/fitur
  berlisensi sama atau boleh dibundel tanpa review. Kebutuhan komersial, branch/PR
  analysis dan terms versi yang dipilih perlu quotation/vendor review.
  [Plans](https://www.sonarsource.com/plans-and-pricing/sonarqube/),
  [Open-source policy](https://www.sonarsource.com/open-source/)
- GitHub menyatakan standard hosted runner untuk repo publik dan penggunaan
  self-hosted runner tidak dikenai biaya menit Actions; storage, seat, enterprise dan
  fitur lain terpisah. CI PoC publik bukan estimasi biaya GitHub Enterprise klien.
  [Billing resmi](https://docs.github.com/en/billing/concepts/product-billing/github-actions)

Sebelum kontrak: sepakati repo/data classification, jumlah pengguna aktif, ukuran
model/konteks, residency, batas dukungan, acceptance benchmark dan pembagian tanggung
jawab bank/vendor. Angka penawaran dapat direvisi berdasarkan hasil pilot tersebut.
