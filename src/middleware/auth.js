'use strict';

const {
    verifyAccessToken
} = require('../utils/jwt');

/**
 * Middleware ya kuthibitisha mtumiaji.
 *
 * Inahitaji:
 * Authorization: Bearer ACCESS_TOKEN
 */
function authenticate(req, res, next) {
    const authorization = req.headers.authorization;

    if (!authorization) {
        return res.status(401).json({
            success: false,
            message: 'Unahitaji kuingia kwenye akaunti kwanza.'
        });
    }

    const parts = authorization.trim().split(/\s+/);

    if (
        parts.length !== 2 ||
        parts[0].toLowerCase() !== 'bearer' ||
        !parts[1]
    ) {
        return res.status(401).json({
            success: false,
            message: 'Muundo wa Authorization Token si sahihi.'
        });
    }

    try {
        const payload = verifyAccessToken(parts[1]);

        // Hifadhi utambulisho uliothibitishwa na tokeni.
        req.auth = {
            userId: payload.sub,
            role: payload.role,
            tokenId: payload.jti || null
        };

        return next();
    } catch (error) {
        // Usionyeshe maelezo ya ndani ya uthibitishaji kwa mteja.
        return res.status(401).json({
            success: false,
            message: 'Tokeni si sahihi au muda wake umeisha.'
        });
    }
}

/**
 * Middleware ya ruhusa za role.
 *
 * Mfano:
 * requireRole('admin')
 */
function requireRole(...allowedRoles) {
    return function (req, res, next) {
        if (!req.auth || !req.auth.userId) {
            return res.status(401).json({
                success: false,
                message: 'Unahitaji kuthibitisha akaunti yako.'
            });
        }

        if (!allowedRoles.includes(req.auth.role)) {
            return res.status(403).json({
                success: false,
                message: 'Huna ruhusa ya kufanya kitendo hiki.'
            });
        }

        return next();
    };
}

module.exports = {
    authenticate,
    requireRole
};
