# Menjalankan dan menguji sendiri

Semua langkah berikut untuk repo sintetis `bayuzen19/testing-bank`. Jangan gunakan
database/credential produksi. Prasyarat: Node 22.19+, Python 3.13, Docker dan Ollama.

## Web dan QA lokal

```powershell
cd 'F:\programming\poc\hermes bank muamalat\testing-bank'
npm ci
node scripts/init_demo.mjs
docker compose up -d
npx playwright install chromium
npm run test:coverage
npm run dev:api
```

Di terminal kedua jalankan `npm run dev`, lalu buka http://localhost:5174.
Di terminal ketiga jalankan `npm run test:e2e`. Laporan ada di `playwright-report`;
`npx playwright show-report` membukanya. Build produksi diperiksa dengan `npm run build`.

## Use case penerimaan

1. Buat akun bernama `Demo Alya`, email baru berawalan `demo` di `@example.test`,
   password minimal 12 karakter. Centang pemahaman data sintetis. Marketing tidak aktif.
2. Dashboard menunjukkan saldo awal Rp5.000.000. Reload harus memulihkan akun/saldo.
3. Pilih Demo Yayasan Pendidikan, Rp125.000; tinjau, konfirmasi, lalu periksa bukti
   dan saldo Rp4.875.000. Ini simulasi, tanpa uang nyata.
4. Tes browser otomatis memutus respons setelah server commit, kemudian retry;
   hanya satu transfer boleh tercatat. Tes API memeriksa request paralel dan IDOR.
5. Di Privasi, ubah lalu tarik preferensi marketing, reautentikasi untuk export JSON,
   ajukan penghapusan. Status harus received/pending review, bukan langsung terhapus.
6. Logout lalu reload. Cookie lama tidak boleh mendapat sesi atau data rekening.
7. Tes negatif: domain email nyata ditolak, saldo tidak cukup, user lain 404,
   CSRF/origin salah 403, key/tag/cipher tampering gagal tertutup.

## Agent coding dan GitHub review

`hermes -p koding` membuka profil bank. Pastikan preflight lokal terlebih dahulu:

```powershell
python scripts/agent_preflight.py --profile "$env:LOCALAPPDATA/hermes/profiles/koding"
```

Berikan task contract dengan scope file dan tes penerimaan. Minta agent membaca
kontrak, mengubah implementasi, menjalankan tes dan melaporkan kegagalan. Simpan log
di `reports`; jangan memasukkan token/kunci/data nasabah ke prompt.

PR evaluasi sengaja mengandung satu bug otorisasi dan **tidak boleh dimerge**:
https://github.com/bayuzen19/testing-bank/pull/1

```powershell
./scripts/review_github.ps1 -PullRequest 1
```

Script meminta token read-only tanpa mencetaknya. Hasil JSON harus menyebut file,
baris, evidence, usulan perbaikan, model/digest, keterbatasan dan SHA. Review lokal
tidak memposting komentar atau mengubah PR. Gunakan PR aplikasi untuk review lanjutan;
laporan dengan omitted_files bukan review menyeluruh.

## GitHub CI dan dokumen

Push ke branch `bank-agent-e2e` atau `main` memicu workflow. Tes unit/integrasi,
browser pada build produksi, audit dependensi, tooling, Sonar dan container harus
berhasil. Tab Actions menyediakan `bank-release-SHA` (Markdown/PDF) dan bukti run.
Tidak ada LLM cloud di workflow. Workflow tidak melakukan deploy otomatis ke bank.

## Kubernetes lokal dan promosi internal

`deploy/kubernetes.yaml` adalah baseline; image harus diisi eksplisit. `deploy/local-db.yaml`
disposable dan hanya untuk demo. Script `deploy_local.py` mengunci context
`kind-testing-bank`; kubeconfig diberikan eksplisit, sehingga tidak memakai cluster
yang sedang aktif pada komputer. Load image commit ke kind sebelum deploy.

Untuk internal: pilih digest registry yang lulus CI, siapkan namespace/secret via
mekanisme bank, HTTPS/Secure cookie, database ber-HA dan CNI enforcing. Lakukan
server dry-run, approval environment, rollout, smoke test dan rollback ke digest
sebelumnya. Jangan menyalin database disposable atau key PoC ke produksi.

## Menghentikan demo

Hentikan terminal API/Vite dengan Ctrl+C. `docker compose down --volumes` hanya
menghapus database sintetis project ini. Untuk cluster lokal yang memang dibuat
khusus demo, `kind delete cluster --name testing-bank` dengan kubeconfig khusus.
Container scanner bernama `testing-bank-sonar` dapat dihapus dengan
`docker rm -f -v testing-bank-sonar`. Jangan menjalankan docker system prune.
Unload model menggunakan `ollama stop NAMA_MODEL`; shutdown proses Ollama hanya
jika tidak ada pekerjaan model lain yang masih digunakan.
