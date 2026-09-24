CREATE TABLE IF NOT EXISTS users (
 id UUID PRIMARY KEY, email_lookup TEXT NOT NULL UNIQUE, email_cipher TEXT NOT NULL,
 name_cipher TEXT NOT NULL, password_hash TEXT NOT NULL, consent_version TEXT NOT NULL,
 marketing BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS accounts (
 id TEXT PRIMARY KEY, user_id UUID UNIQUE REFERENCES users(id), label TEXT NOT NULL,
 balance BIGINT NOT NULL CHECK (balance>=0), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id), csrf TEXT NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS transfers (
 id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id), source TEXT NOT NULL REFERENCES accounts(id),
 destination TEXT NOT NULL REFERENCES accounts(id), amount BIGINT NOT NULL CHECK (amount>0),
 idem_key TEXT NOT NULL, request_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(user_id,idem_key)
);
CREATE TABLE IF NOT EXISTS audit_events (
 id UUID PRIMARY KEY, actor_ref TEXT NOT NULL, event TEXT NOT NULL, reference TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS privacy_requests (
 id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id), type TEXT NOT NULL CHECK(type IN ('access','correction','erasure')),
 status TEXT NOT NULL DEFAULT 'received', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO accounts(id,label,balance) VALUES ('DEMO-1001','Demo Yayasan Pendidikan',10000000),('DEMO-1002','Demo Keluarga',5000000) ON CONFLICT DO NOTHING;
