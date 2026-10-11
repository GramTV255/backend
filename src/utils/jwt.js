'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');

const ACCESS_EXPIRES_IN =
    process.env.JWT_ACCESS_EXPIRES_IN || '15m';

const REFRESH_EXPIRES_IN =
    process.env.JWT_REFRESH_EXPIRES_IN || '7d';

function getSecret(name) {
    const secret = process.env[name];

    if (
        typeof secret !== 'string' ||
        secret.length < 32
    ) {
        throw new Error(
            `${name} haijawekwa vizuri. Tumia siri yenye angalau herufi 32.`
        );
    }

    return secret;
}

/**
 * Tengeneza Access Token.
 */
function createAccessToken(user) {
    if (!user || !user.id) {
        throw new Error('Taarifa za mtumiaji hazijakamilika.');
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
            issuer: 'backend',
            audience: 'backend-android'
        }
    );
}

/**
 * Tengeneza Refresh Token ya JWT.
 *
 * Token hii itahitaji pia kuhifadhiwa kama hash kwenye
 * refresh_tokens ili iweze kufutwa au kubatilishwa.
 */
function createRefreshToken(user) {
    if (!user || !user.id) {
        throw new Error('Taarifa za mtumiaji hazijakamilika.');
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
            issuer: 'backend',
            audience: 'backend-android'
        }
    );

    return {
        token,
        tokenId
    };
}

/**
 * Thibitisha Access Token.
 */
function verifyAccessToken(token) {
    const secret = getSecret('JWT_ACCESS_SECRET');

    const payload = jwt.verify(token, secret, {
        algorithms: ['HS256'],
        issuer: 'backend',
        audience: 'backend-android'
    });

    if (payload.type !== 'access' || !payload.sub) {
        throw new Error('Access Token si sahihi.');
    }

    return payload;
}

/**
 * Thibitisha Refresh Token.
 */
function verifyRefreshToken(token) {
    const secret = getSecret('JWT_REFRESH_SECRET');

    const payload = jwt.verify(token, secret, {
        algorithms: ['HS256'],
        issuer: 'backend',
        audience: 'backend-android'
    });

    if (
        payload.type !== 'refresh' ||
        !payload.sub ||
        !payload.jti
    ) {
        throw new Error('Refresh Token si sahihi.');
    }

    return payload;
}

module.exports = {
    createAccessToken,
    createRefreshToken,
    verifyAccessToken,
    verifyRefreshToken
};
