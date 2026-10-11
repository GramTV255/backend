'use strict';

const crypto = require('node:crypto');
const bcrypt = require('bcrypt');

// Idadi ya mizunguko ya bcrypt.
const BCRYPT_ROUNDS = 12;

/**
 * Tengeneza hash ya nywila.
 * Hash ndiyo itahifadhiwa kwenye database.
 */
async function hashPassword(password) {
    if (typeof password !== 'string') {
        throw new TypeError('Nywila lazima iwe maandishi.');
    }

    if (password.length < 8 || password.length > 128) {
        throw new Error(
            'Nywila lazima iwe na urefu wa herufi 8 hadi 128.'
        );
    }

    return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Linganisha nywila na hash iliyohifadhiwa.
 */
async function verifyPassword(password, passwordHash) {
    if (
        typeof password !== 'string' ||
        typeof passwordHash !== 'string'
    ) {
        return false;
    }

    return bcrypt.compare(password, passwordHash);
}

/**
 * Tengeneza tokeni nasibu yenye usalama wa kriptografia.
 */
function generateSecureToken() {
    return crypto.randomBytes(32).toString('base64url');
}

/**
 * Tengeneza hash ya tokeni kwa SHA-256.
 * Tumia hash hii kuhifadhi refresh token kwenye database.
 */
function hashToken(token) {
    if (typeof token !== 'string' || token.length === 0) {
        throw new TypeError('Tokeni si sahihi.');
    }

    return crypto
        .createHash('sha256')
        .update(token, 'utf8')
        .digest('hex');
}

/**
 * Tengeneza UUID kwa IDs za rekodi.
 */
function generateId() {
    return crypto.randomUUID();
}

module.exports = {
    hashPassword,
    verifyPassword,
    generateSecureToken,
    hashToken,
    generateId
};
