import { useEffect, useRef, useState } from "react";
const money = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
const messages = {
  INSUFFICIENT_FUNDS: "Saldo demo tidak mencukupi.",
  INVALID_CREDENTIALS: "Email atau kata sandi salah.",
  SYNTHETIC_IDENTITY_REQUIRED:
    "Gunakan nama berawalan Demo dan email demo…@example.test.",
  ACCOUNT_UNAVAILABLE: "Akun demo sudah terdaftar. Silakan masuk.",
  REAUTHENTICATION_REQUIRED: "Konfirmasi kata sandi belum sesuai.",
  CSRF_REJECTED: "Sesi perlu dimuat ulang.",
  LOGIN_REQUIRED: "Sesi berakhir. Silakan masuk kembali.",
};
async function request(path, { method = "GET", body, csrf, key } = {}) {
  let response;
  try {
    response = await fetch("/api" + path, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
        ...(key ? { "Idempotency-Key": key } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error(
      "Koneksi terputus. Coba kembali; referensi transfer yang sama tetap digunakan.",
    );
  }
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      messages[data.error] ||
        "Permintaan belum berhasil. Silakan coba kembali.",
    );
  return data;
}
const emptyAuth = {
  name: "",
  email: "",
  password: "",
  marketing: false,
  consent: false,
};
function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">m</span>
      <div>
        muamalat<span className="brand-caption">DIGITAL BANKING · PoC</span>
      </div>
    </div>
  );
}
export default function App() {
  const [session, setSession] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [mode, setMode] = useState("register"),
    [auth, setAuth] = useState(emptyAuth),
    [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("Ringkasan"),
    [accounts, setAccounts] = useState([]),
    [beneficiaries, setBeneficiaries] = useState([]),
    [transfers, setTransfers] = useState([]);
  const [destination, setDestination] = useState(""),
    [amount, setAmount] = useState(""),
    [review, setReview] = useState(false),
    [receipt, setReceipt] = useState(null);
  const [exportPassword, setExportPassword] = useState(""),
    [privacyResult, setPrivacyResult] = useState(""),
    [requests, setRequests] = useState([]);
  const transferKey = useRef(null),
    operation = useRef(false);
  const refresh = async () => {
    const [a, b, t] = await Promise.all([
      request("/accounts"),
      request("/beneficiaries"),
      request("/transfers"),
    ]);
    setAccounts(a);
    setBeneficiaries(b);
    setTransfers(t);
  };
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/session");
        if (response.status === 401) return;
        if (!response.ok) throw new Error("Sesi belum dapat dimuat.");
        const data = await response.json();
        if (active) {
          setSession(data);
          await refresh();
        }
      } catch (e) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  const run = async (fn) => {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      operation.current = false;
      setBusy(false);
    }
  };
  const submitAuth = (e) => {
    e.preventDefault();
    run(async () => {
      await request("/auth/" + mode, {
        method: "POST",
        body:
          mode === "register"
            ? {
                name: auth.name,
                email: auth.email,
                password: auth.password,
                marketing: auth.marketing,
                consentVersion: "2026-09-24",
              }
            : { email: auth.email, password: auth.password },
      });
      setSession(await request("/session"));
      setAuth(emptyAuth);
      await refresh();
    });
  };
  const logout = () =>
    run(async () => {
      await request("/auth/logout", {
        method: "POST",
        body: {},
        csrf: session.csrf,
      });
      setSession(null);
      setAuth(emptyAuth);
      setAccounts([]);
      setBeneficiaries([]);
      setTransfers([]);
      setReceipt(null);
      setExportPassword("");
      setPrivacyResult("");
      setRequests([]);
      setTab("Ringkasan");
      setAmount("");
      setDestination("");
      setReview(false);
      transferKey.current = null;
    });
  const validAmount =
    Number.isSafeInteger(Number(amount)) &&
    Number(amount) > 0 &&
    Number(amount) <= 1e9;
  const send = () =>
    run(async () => {
      if (!validAmount || !destination)
        throw new Error("Periksa penerima dan jumlah rupiah bulat.");
      transferKey.current ??= crypto.randomUUID();
      const result = await request("/transfers", {
        method: "POST",
        body: { destination, amount: Number(amount) },
        csrf: session.csrf,
        key: transferKey.current,
      });
      setReceipt(result);
      transferKey.current = null;
      setReview(false);
      setAmount("");
      setDestination("");
      await refresh();
    });
  const openTab = (next) => {
    setTab(next);
    setError("");
    if (next === "Privasi")
      run(async () => setRequests(await request("/privacy/requests")));
  };
  const consent = (marketing) =>
    run(async () => {
      const data = await request("/privacy/consent", {
        method: "PATCH",
        body: { marketing },
        csrf: session.csrf,
      });
      setSession((s) => ({ ...s, marketing: data.marketing }));
    });
  const exportData = () =>
    run(async () => {
      try {
        const data = await request("/privacy/export", {
          method: "POST",
          body: { password: exportPassword },
          csrf: session.csrf,
        });
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
          }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = "data-demo-saya.json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } finally {
        setExportPassword("");
      }
    });
  const erasure = () =>
    run(async () => {
      const data = await request("/privacy/requests", {
        method: "POST",
        body: { type: "erasure" },
        csrf: session.csrf,
      });
      setPrivacyResult(data.message);
      setRequests(await request("/privacy/requests"));
    });
  if (loading) return <main className="loading">Memuat ruang demo…</main>;
  if (!session)
    return (
      <AuthView
        {...{ mode, auth, error, busy, submitAuth, setAuth, setMode, setError }}
      />
    );
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Brand />
        <p className="sidebar-caption">RUANG FINANSIAL ANDA</p>
        <nav aria-label="Menu utama">
          {["Ringkasan", "Privasi"].map((item, index) => (
            <button
              type="button"
              key={item}
              aria-label={item}
              aria-current={tab === item ? "page" : undefined}
              className={tab === item ? "nav active" : "nav"}
              onClick={() => openTab(item)}
            >
              <span>0{index + 1}</span>
              {item}
              <span>↗</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="pill light">LINGKUNGAN DEMO</span>
          <p>
            Semua saldo dan transaksi
            <br />
            di ruang ini bersifat sintetis.
          </p>
          <div className="user-name">{session.name}</div>
          <button
            type="button"
            className="logout"
            onClick={logout}
            disabled={busy}
          >
            Log Out
          </button>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="topbar">
          <span>MUAMALAT / DIGITAL EXPERIENCE</span>
          <span className="status-dot">PoC · Data sintetis</span>
        </header>
        <main className="content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {tab === "Ringkasan"
                  ? "SELAMAT DATANG KEMBALI"
                  : "PUSAT PRIVASI"}
              </p>
              <h1>
                {tab === "Ringkasan"
                  ? "Satu ruang. Semua kendali."
                  : "Data Anda, pilihan Anda."}
              </h1>
            </div>
            <span className="edition">
              DEMO
              <br />
              2026
            </span>
          </div>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          {tab === "Ringkasan" ? (
            <BankSummary
              {...{
                accounts,
                transfers,
                receipt,
                review,
                destination,
                amount,
                validAmount,
                busy,
                beneficiaries,
                setDestination,
                setAmount,
                setReview,
                setError,
                setReceipt,
                send,
                transferKey,
              }}
            />
          ) : (
            <PrivacyView
              {...{
                session,
                busy,
                consent,
                exportPassword,
                setExportPassword,
                exportData,
                erasure,
                privacyResult,
                requests,
              }}
            />
          )}
          <footer className="page-footer">
            <span>Proof of concept independen · Bayuzen Ahmad</span>
            <span>Tidak terhubung dengan layanan bank atau KYC nyata.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function AuthView({
  mode,
  auth,
  error,
  busy,
  submitAuth,
  setAuth,
  setMode,
  setError,
}) {
  const action = mode === "register" ? "Daftar Sekarang" : "Masuk";
  const submitLabel = busy ? "Memproses…" : action;
  return (
    <div className="auth-layout">
      <section className="editorial">
        <Brand />
        <div className="editorial-copy">
          <p className="eyebrow">RUANG DEMO PERBANKAN</p>
          <h1>
            Langkah kecil.
            <br />
            Makna besar.
          </h1>
          <p>
            Pengalaman finansial yang tenang, dengan kendali data di tangan
            Anda.
          </p>
          <div className="editorial-ledger">
            <span>01 / Buka akun sintetis</span>
            <span>02 / Tinjau & simulasikan transfer</span>
            <span>03 / Kelola pilihan privasi</span>
          </div>
        </div>
        <p className="legal-note">
          Proof of concept independen oleh Bayuzen Ahmad.
          <br />
          Bukan layanan resmi atau endorsement Bank Muamalat.
        </p>
      </section>
      <main className="auth-side">
        <div className="auth-card">
          <span className="pill">DATA SINTETIS SAJA</span>
          <h2>
            {mode === "register" ? "Buka akun demo" : "Masuk ke akun demo"}
          </h2>
          <p className="muted">Tanpa KTP, nomor telepon, atau uang nyata.</p>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <form onSubmit={submitAuth}>
            {mode === "register" && (
              <>
                <label htmlFor="name">Nama Lengkap</label>
                <input
                  id="name"
                  autoComplete="off"
                  placeholder="Demo Alya"
                  required
                  maxLength={50}
                  value={auth.name}
                  onChange={(e) => setAuth({ ...auth, name: e.target.value })}
                />
              </>
            )}
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="off"
              placeholder="demo.alya@example.test"
              required
              value={auth.email}
              onChange={(e) => setAuth({ ...auth, email: e.target.value })}
            />
            <label htmlFor="password">
              Kata Sandi{mode === "register" ? " (min. 12 karakter)" : ""}
            </label>
            <input
              id="password"
              type="password"
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              required
              minLength={mode === "register" ? 12 : 1}
              maxLength={128}
              value={auth.password}
              onChange={(e) => setAuth({ ...auth, password: e.target.value })}
            />
            {mode === "register" && (
              <>
                <label className="check">
                  <input
                    type="checkbox"
                    required
                    checked={auth.consent}
                    onChange={(e) =>
                      setAuth({ ...auth, consent: e.target.checked })
                    }
                  />
                  <span>Saya memahami penggunaan data sintetis</span>
                </label>
                <p className="notice-text">
                  Nama dan email demo dienkripsi untuk menjalankan simulasi
                  akun. Pemberitahuan versi 24 September 2026. Jangan masukkan
                  data pribadi nyata.
                </p>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={auth.marketing}
                    onChange={(e) =>
                      setAuth({ ...auth, marketing: e.target.checked })
                    }
                  />
                  <span>Kirim penawaran produk terbaru (opsional)</span>
                </label>
              </>
            )}
            <button type="submit" className="primary full" disabled={busy}>
              {submitLabel}
            </button>
          </form>
          <p className="switch">
            {mode === "register"
              ? "Sudah punya akun demo?"
              : "Belum punya akun demo?"}{" "}
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setMode(mode === "register" ? "login" : "register");
                setAuth(emptyAuth);
                setError("");
              }}
            >
              {mode === "register" ? "Masuk di sini" : "Buka akun demo"}
            </button>
          </p>
        </div>
        <p className="auth-footer">HERMES EVALUATION / APLIKASI UJI / 2026</p>
      </main>
    </div>
  );
}
function BankSummary({
  accounts,
  transfers,
  receipt,
  review,
  destination,
  amount,
  validAmount,
  busy,
  beneficiaries,
  setDestination,
  setAmount,
  setReview,
  setError,
  setReceipt,
  send,
  transferKey,
}) {
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);

  return (
    <div className="bank-grid">
      <div>
        <section className="passbook">
          <div className="passbook-top">
            <span>Saldo Tersedia</span>
            <button
              type="button"
              className="text-button balance-toggle"
              aria-pressed={isBalanceHidden}
              onClick={() => setIsBalanceHidden((hidden) => !hidden)}
            >
              {isBalanceHidden ? "Tampilkan saldo" : "Sembunyikan saldo"}
            </button>
          </div>
          <div className="passbook-header">
             <span className="pill light">IDR / SINTETIS</span>
          </div>
          {accounts.map((a) => (
            <div key={a.id}>
              <div className={isBalanceHidden ? "balance balance-hidden" : "balance"}>
                {isBalanceHidden ? "Saldo disembunyikan" : money(a.balance)}
              </div>
              <div className="account-line">
                <span>{a.label}</span>
                <span>{a.maskedNumber}</span>
              </div>
            </div>
          ))}
          <p className="passbook-foot">
            Buku rekening digital / Tanpa uang nyata
          </p>
        </section>
        <section className="history">
          <div className="section-heading">
            <h2>Catatan transaksi</h2>
            <span>{transfers.length} transaksi</span>
          </div>
          {transfers.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>PENERIMA / TANGGAL</th>
                    <th>JUMLAH</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((t) => (
                    <tr key={t.id}>
                      <td>
                        {t.recipient}
                        <small>
                          {new Date(t.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </small>
                      </td>
                      <td className="numeric">− {money(t.amount)}</td>
                      <td>
                        <span className="status-tag">Selesai</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">
              <span>01</span>
              <div>
                Catatan pertama dimulai dari sini.
                <p>
                  Setiap simulasi transfer akan tercatat di buku rekening Anda.
                </p>
              </div>
            </div>
          )}
        </section>
        {receipt && (
          <output className="success">
            <strong>Transfer demo berhasil</strong>
            <p>Simulasi selesai. Tidak ada uang nyata yang dipindahkan.</p>
            <small>Referensi {receipt.id}</small>
          </output>
        )}
        <div className="privacy-hint">
          <span>PRIVASI SEJAK AWAL</span>
          <p>
            Email ditampilkan tersamar. Anda bisa mengubah persetujuan dan
            meminta akses data melalui menu Privasi.
          </p>
        </div>
      </div>
      <section className="transfer-panel">
        <span className="eyebrow">PINDAHKAN KEBAIKAN</span>
        <h2>Transfer dana</h2>
        <p className="muted">Hanya ke penerima demo yang tersedia.</p>
        {!review ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (validAmount && destination) {
                setReview(true);
                setError("");
                setReceipt(null);
              }
            }}
          >
            <label htmlFor="destination">Penerima</label>
            <select
              id="destination"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            >
              <option value="">Pilih Penerima</option>
              {beneficiaries.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
            <label htmlFor="amount">Jumlah (IDR)</label>
            <input
              id="amount"
              type="number"
              min="1"
              max="1000000000"
              step="1"
              required
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button
              type="submit"
              className="primary full"
              disabled={!destination || !validAmount || busy}
            >
              Tinjau Transfer
            </button>
          </form>
        ) : (
          <div className="review">
            <h3>Konfirmasi Transfer</h3>
            <dl>
              <dt>Penerima</dt>
              <dd>{beneficiaries.find((b) => b.id === destination)?.label}</dd>
              <dt>Jumlah</dt>
              <dd className="review-amount">{money(Number(amount))}</dd>
            </dl>
            <button
              type="button"
              className="primary full"
              disabled={busy}
              onClick={send}
            >
              {busy ? "Memproses…" : "Kirim Simulasi"}
            </button>
            <button
              type="button"
              className="text-button full"
              disabled={busy || Boolean(transferKey.current)}
              onClick={() => setReview(false)}
            >
              Kembali
            </button>
            {transferKey.current && (
              <p className="notice-text">
                Status koneksi belum pasti. Kirim ulang dengan referensi yang
                sama untuk menghindari transfer ganda.
              </p>
            )}
          </div>
        )}
        <div className="transfer-note">
          <span>TRANSAKSI TERKONTROL</span>
          <p>
            Tinjau penerima dan jumlah sebelum mengirim. Retry menggunakan
            referensi yang sama.
          </p>
        </div>
      </section>
    </div>
  );
}

function PrivacyView({
  session,
  busy,
  consent,
  exportPassword,
  setExportPassword,
  exportData,
  erasure,
  privacyResult,
  requests,
}) {
  return (
    <section className="privacy-page">
      <div className="privacy-summary">
        <div>
          <span className="eyebrow">PROFIL DEMO</span>
          <h2>{session.name}</h2>
          <p>{session.email}</p>
        </div>
        <p>
          Pemberitahuan privasi
          <br />
          <strong>{session.consentVersion}</strong>
        </p>
      </div>
      <div className="privacy-grid">
        <section className="privacy-card">
          <span className="step">01 / PERSETUJUAN</span>
          <h2>Penawaran pilihan</h2>
          <p>
            Persetujuan pemasaran bersifat opsional. Anda dapat menariknya kapan
            saja.
          </p>
          <div className="consent-state">
            Status penawaran{" "}
            <strong>{session.marketing ? "Aktif" : "Non-aktif"}</strong>
          </div>
          <div className="button-row">
            <button
              type="button"
              className="secondary"
              disabled={busy || session.marketing}
              onClick={() => consent(true)}
            >
              Aktifkan Penawaran
            </button>
            <button
              type="button"
              className="secondary"
              disabled={busy || !session.marketing}
              onClick={() => consent(false)}
            >
              Matikan Penawaran
            </button>
          </div>
        </section>
        <section className="privacy-card">
          <span className="step">02 / AKSES DATA</span>
          <h2>Salinan profil Anda</h2>
          <p>
            Unduh profil sendiri dalam JSON setelah verifikasi ulang. Permintaan
            akses di luar profil memerlukan peninjauan.
          </p>
          <label htmlFor="export-password">Konfirmasi Kata Sandi</label>
          <input
            id="export-password"
            type="password"
            autoComplete="current-password"
            maxLength={128}
            value={exportPassword}
            onChange={(e) => setExportPassword(e.target.value)}
          />
          <button
            type="button"
            className="primary"
            disabled={busy || !exportPassword}
            onClick={exportData}
          >
            Unduh Data Saya
          </button>
        </section>
        <section className="privacy-card wide">
          <div>
            <span className="step">03 / PERMINTAAN HAK DATA</span>
            <h2>Ajukan penghapusan</h2>
            <p>
              Permintaan dicatat untuk peninjauan verifikasi dan kewajiban
              retensi. Data tidak langsung dihapus oleh tombol ini.
            </p>
          </div>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={erasure}
          >
            Ajukan Penghapusan
          </button>
          {privacyResult && <p className="success">{privacyResult}</p>}
          {requests.length > 0 && (
            <div className="request-list">
              {requests.map((r) => (
                <p key={r.id}>
                  <span>
                    Penghapusan ·{" "}
                    {r.status === "received"
                      ? "Diterima untuk ditinjau"
                      : r.status}
                  </span>
                  <small>Referensi {r.id}</small>
                </p>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
