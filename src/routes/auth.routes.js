'use strict';

const express = require('express');
const { z } = require('zod');

const {
    getPool
} = require('../database/pool');

const {
    hashPassword,
    verifyPassword,
    generateSecureToken,
    hashToken,
    generateId
} = require('../utils/crypto');

const {
    createAccessToken,
    createRefreshToken,
    verifyRefreshToken
} = require('../utils/jwt');

const router = express.Router();

// =====================================================
// VALIDATION
// =====================================================

const registerSchema = z.object({
    username: z.string()
        .trim()
        .min(3)
        .max(50)
        .regex(/^[a-zA-Z0-9_.-]+$/)
        .optional(),

    email: z.string()
        .trim()
        .email()
        .max(255)
        .transform((value) => value.toLowerCase())
        .optional(),

    phone: z.string()
        .trim()
        .min(7)
        .max(30)
        .optional(),

    password: z.string()
        .min(8)
        .max(128)
}).strict().refine((value) => {
    return Boolean(value.username || value.email || value.phone);
}, {
    message: 'Username, email au phone inahitajika.'
});

const loginSchema = z.object({
    identifier: z.string().trim().min(1).max(255),
    password: z.string().min(1).max(128)
}).strict();

const refreshSchema = z.object({
    refreshToken: z.string().min(1).max(4096)
}).strict();

// =====================================================
// HELPER: TOKEN RESPONSE
// =====================================================

async function issueTokens(client, user) {
    const accessToken = createAccessToken(user);

    const refresh = createRefreshToken(user);

    const refreshTokenHash = hashToken(refresh.token);

    const expiresAt = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
    );

    await client.query(
        `INSERT INTO refresh_tokens
        (id, user_id, token_hash, expires_at)
        VALUES ($1, $2, $3, $4)`,
        [
            generateId(),
            user.id,
            refreshTokenHash,
            expiresAt
        ]
    );

    return {
        accessToken,
        refreshToken: refresh.token,
        tokenType: 'Bearer',
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m'
    };
}

// =====================================================
// POST /api/auth/register
// =====================================================

router.post('/register', async (req, res, next) => {
    let client;

    try {
        const parsed = registerSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: 'Taarifa ulizotuma si sahihi.',
                errors: parsed.error.issues.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message
                }))
            });
        }

        const input = parsed.data;

        client = await getPool().connect();

        await client.query('BEGIN');

        const username = input.username || null;
        const email = input.email || null;
        const phone = input.phone || null;

        const existing = await client.query(
            `SELECT id
             FROM users
             WHERE ($1::varchar IS NOT NULL AND username = $1)
                OR ($2::varchar IS NOT NULL AND email = $2)
                OR ($3::varchar IS NOT NULL AND phone = $3)
             LIMIT 1`,
            [username, email, phone]
        );

        if (existing.rowCount > 0) {
            await client.query('ROLLBACK');

            return res.status(409).json({
                success: false,
                message: 'Username, email au simu tayari imesajiliwa.'
            });
        }

        const userId = generateId();

        const passwordHash = await hashPassword(input.password);

        const result = await client.query(
            `INSERT INTO users
             (id, username, email, phone, password_hash)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, username, email, phone, role, status, created_at`,
            [
                userId,
                username,
                email,
                phone,
                passwordHash
            ]
        );

        const user = result.rows[0];

        const tokens = await issueTokens(client, user);

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Akaunti imetengenezwa kwa mafanikio.',
            user,
            tokens
        });

    } catch (error) {
        if (client) {
            try {
                await client.query('ROLLBACK');
            } catch (_) {
                // Transaction inaweza kuwa tayari imefungwa.
            }
        }

        if (error.code === '23505') {
            return res.status(409).json({
                success: false,
                message: 'Taarifa hizi tayari zimesajiliwa.'
            });
        }

        next(error);

    } finally {
        if (client) {
            client.release();
        }
    }
});

// =====================================================
// POST /api/auth/login
// =====================================================

router.post('/login', async (req, res, next) => {
    let client;

    try {
        const parsed = loginSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: 'Weka identifier na password sahihi.'
            });
        }

        const { identifier, password } = parsed.data;

        client = await getPool().connect();

        const result = await client.query(
            `SELECT id, username, email, phone,
                    password_hash, role, status, created_at
             FROM users
             WHERE username = $1
                OR email = LOWER($1)
                OR phone = $1
             LIMIT 1`,
            [identifier]
        );

        if (result.rowCount === 0) {
            return res.status(401).json({
                success: false,
                message: 'Taarifa za kuingia si sahihi.'
            });
        }

        const user = result.rows[0];

        const passwordMatches = await verifyPassword(
            password,
            user.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: 'Taarifa za kuingia si sahihi.'
            });
        }

        if (user.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Akaunti hii imesimamishwa.'
            });
        }

        await client.query('BEGIN');

        const tokens = await issueTokens(client, user);

        await client.query('COMMIT');

        delete user.password_hash;

        return res.status(200).json({
            success: true,
            message: 'Umeingia kwa mafanikio.',
            user,
            tokens
        });

    } catch (error) {
        if (client) {
            try {
                await client.query('ROLLBACK');
            } catch (_) {}
        }

        next(error);

    } finally {
        if (client) {
            client.release();
        }
    }
});

// =====================================================
// POST /api/auth/refresh
// =====================================================

router.post('/refresh', async (req, res, next) => {
    let client;

    try {
        const parsed = refreshSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token inahitajika.'
            });
        }

        const { refreshToken } = parsed.data;

        let payload;

        try {
            payload = verifyRefreshToken(refreshToken);
        } catch (_) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token si sahihi au imeisha muda.'
            });
        }

        client = await getPool().connect();

        await client.query('BEGIN');

        // Zuia token iliyotumika au kufutwa.
        const oldToken = await client.query(
            `SELECT id, user_id
             FROM refresh_tokens
             WHERE token_hash = $1
               AND user_id = $2
               AND revoked_at IS NULL
               AND expires_at > NOW()
             FOR UPDATE`,
            [
                hashToken(refreshToken),
                payload.sub
            ]
        );

        if (oldToken.rowCount === 0) {
            await client.query('ROLLBACK');

            return res.status(401).json({
                success: false,
                message: 'Refresh token haitumiki tena.'
            });
        }

        const userResult = await client.query(
            `SELECT id, username, email, phone, role, status, created_at
             FROM users
             WHERE id = $1`,
            [payload.sub]
        );

        if (
            userResult.rowCount === 0 ||
            userResult.rows[0].status !== 'active'
        ) {
            await client.query('ROLLBACK');

            return res.status(401).json({
                success: false,
                message: 'Akaunti haipatikani au imesimamishwa.'
            });
        }

        // Tumia token moja tu; ya zamani inafutwa.
        await client.query(
            `UPDATE refresh_tokens
             SET revoked_at = NOW()
             WHERE id = $1`,
            [oldToken.rows[0].id]
        );

        const user = userResult.rows[0];

        const tokens = await issueTokens(client, user);

        await client.query('COMMIT');

        return res.status(200).json({
            success: true,
            message: 'Token zimefanywa upya.',
            tokens
        });

    } catch (error) {
        if (client) {
            try {
                await client.query('ROLLBACK');
            } catch (_) {}
        }

        next(error);

    } finally {
        if (client) {
            client.release();
        }
    }
});

// =====================================================
// POST /api/auth/logout
// =====================================================

router.post('/logout', async (req, res, next) => {
    try {
        const parsed = refreshSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token inahitajika.'
            });
        }

        const { refreshToken } = parsed.data;

        let payload;

        try {
            payload = verifyRefreshToken(refreshToken);
        } catch (_) {
            // Jibu la logout linabaki salama hata kama
            // token tayari imeisha muda.
            return res.status(200).json({
                success: true,
                message: 'Umetoka kwenye akaunti.'
            });
        }

        await getPool().query(
            `UPDATE refresh_tokens
             SET revoked_at = NOW()
             WHERE token_hash = $1
               AND user_id = $2
               AND revoked_at IS NULL`,
            [
                hashToken(refreshToken),
                payload.sub
            ]
        );

        return res.status(200).json({
            success: true,
            message: 'Umetoka kwenye akaunti.'
        });

    } catch (error) {
        next(error);
    }
});

module.exports = router;
