-- =====================================================
-- BACKEND DATABASE SCHEMA
-- PostgreSQL
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 1. Watumiaji
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,

    username VARCHAR(50) UNIQUE,

    email VARCHAR(255) UNIQUE,

    phone VARCHAR(30) UNIQUE,

    password_hash TEXT NOT NULL,

    role VARCHAR(20) NOT NULL DEFAULT 'user'
        CHECK (role IN ('user', 'admin')),

    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended')),

    email_verified BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_status
    ON users(status);

-- -----------------------------------------------------
-- 2. Data zinazomilikiwa na watumiaji
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS user_data (
    id UUID PRIMARY KEY,

    owner_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    data_type VARCHAR(100) NOT NULL,

    title VARCHAR(255) NOT NULL,

    content JSONB NOT NULL DEFAULT '{}'::jsonb,

    visibility VARCHAR(20) NOT NULL DEFAULT 'public'
        CHECK (visibility IN ('public', 'private')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_data_owner
    ON user_data(owner_id);

CREATE INDEX IF NOT EXISTS idx_user_data_type
    ON user_data(data_type);

CREATE INDEX IF NOT EXISTS idx_user_data_visibility
    ON user_data(visibility);

CREATE INDEX IF NOT EXISTS idx_user_data_created
    ON user_data(created_at DESC);

-- -----------------------------------------------------
-- 3. Refresh tokens
-- Hifadhi hash ya token, si token halisi.
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    token_hash TEXT NOT NULL UNIQUE,

    expires_at TIMESTAMPTZ NOT NULL,

    revoked_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user
    ON refresh_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expiry
    ON refresh_tokens(expires_at);

-- -----------------------------------------------------
-- 4. Session za vifaa
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    device_name VARCHAR(150),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    expires_at TIMESTAMPTZ NOT NULL,

    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user
    ON user_sessions(user_id);

COMMIT;
