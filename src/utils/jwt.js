'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');

// =====================================================
// 1. TOKEN CONFIGURATION
// =====================================================

const ACCESS_EXPIRES_IN =
    process.env.JWT_ACCESS_EXPIRES_IN || '15m';

const REFRESH_EXPIRES_IN =
    process.env.JWT_REFRESH_EXPIRES_IN || '7d';

const JWT_ISSUER = 'backend';
const JWT_AUDIENCE = 'backend-android';

// =====================================================
// 2. VALIDATE JWT SECRET
// =====================================================

function getSecret(name) {
    const secret = process.env[name];

    if (
        typeof secret !== 'string' ||
        Buffer.byteLength(secret, 'utf8') < 32
    ) {
        throw new Error(
            `${name} haijawekwa vizuri. ` +
            'Tumia siri yenye angalau bytes 32.'
        );
    }

    return secret;
}

// =====================================================
// 3. CREATE ACCESS TOKEN
// =====================================================

function createAccessToken(user) {
    if (!user || !user.id) {
        throw new Error(
            'Taarifa za mtumiaji hazijakamilika.'
        );
    }

    const secret = getSecret('JWT_ACCESS_SECRET');

    return jwt.sign(
        {
            role: user.role || 'user',
            type: 'access'
        },
        secret,
        {
            algorithm: 'HS256',
            subject: String(user.id),
            expiresIn: ACCESS_EXPIRES_IN,
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE
        }
    );
}

// =====================================================
// 4. CREATE REFRESH TOKEN
// =====================================================

function createRefreshToken(user) {
    if (!user || !user.id) {
        throw new Error(
            'Taarifa za mtumiaji hazijakamilika.'
        );
    }

    const secret = getSecret('JWT_REFRESH_SECRET');

    const tokenId = crypto.randomUUID();

    const token = jwt.sign(
        {
            type: 'refresh'
        },
        secret,
        {
            algorithm: 'HS256',
            subject: String(user.id),
            jwtid: tokenId,
            expiresIn: REFRESH_EXPIRES_IN,
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE
        }
    );

    return {
        token,
        tokenId
    };
}

// =====================================================
// 5. VERIFY ACCESS TOKEN
// =====================================================

function verifyAccessToken(token) {
    if (typeof token !== 'string' || !token) {
        throw new Error('Access Token inahitajika.');
    }

    const secret = getSecret('JWT_ACCESS_SECRET');

    const payload = jwt.verify(token, secret, {
        algorithms: ['HS256'],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE
    });

    if (
        !payload ||
        payload.type !== 'access' ||
        !payload.sub ||
        !payload.exp
    ) {
        throw new Error('Access Token si sahihi.');
    }

    return payload;
}

// =====================================================
// 6. VERIFY REFRESH TOKEN
// =====================================================

function verifyRefreshToken(token) {
    if (typeof token !== 'string' || !token) {
        throw new Error('Refresh Token inahitajika.');
    }

    const secret = getSecret('JWT_REFRESH_SECRET');

    const payload = jwt.verify(token, secret, {
        algorithms: ['HS256'],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE
    });

    if (
        !payload ||
        payload.type !== 'refresh' ||
        !payload.sub ||
        !payload.jti ||
        !payload.exp
    ) {
        throw new Error('Refresh Token si sahihi.');
    }

    return payload;
}

// =====================================================
// 7. EXPORT FUNCTIONS
// =====================================================

module.exports = {
    createAccessToken,
    createRefreshToken,
    verifyAccessToken,
    verifyRefreshToken
};
