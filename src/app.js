'use strict';

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// ==================================================
// 1. DATA API ROUTES
// ==================================================
const dataRoutes = require('./routes/data.routes');

// ==================================================
// 2. JSON REQUESTS
// ==================================================
app.use(express.json({
    limit: '100kb'
}));

// ==================================================
// 3. VICHWA VYA USALAMA
// ==================================================
app.use(helmet());

// ==================================================
// 4. KUPUNGUZA MAOMBI MENGI
// ==================================================
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Maombi ni mengi sana. Jaribu tena baadaye.'
    }
});

app.use('/api/', generalLimiter);

// ==================================================
// 5. TAARIFA ZA API
// ==================================================
app.get('/api', (req, res) => {
    res.status(200).json({
        success: true,
        name: 'backend',
        message: 'Backend API inapatikana.',
        version: '1.0.0'
    });
});

// ==================================================
// 6. HEALTH CHECK
// ==================================================
// ==================================================
// HEALTH CHECK: SERVER
// ==================================================

app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'healthy',
        service: 'backend'
    });
});


// ==================================================
// HEALTH CHECK: DATABASE
// ==================================================

app.get('/health/database', async (req, res) => {
    try {
        const {
            checkDatabaseConnection
        } = require('./database/pool');

        const result = await checkDatabaseConnection();

        return res.status(200).json({
            success: true,
            status: 'connected',
            database: 'postgresql',
            serverTime: result.serverTime
        });

    } catch (error) {
        // Usifichue taarifa za siri za database.
        console.error(
            'Database health check imeshindwa.'
        );

        return res.status(503).json({
            success: false,
            status: 'unavailable',
            message: 'Database haipatikani kwa sasa.'
        });
    }
});

// ==================================================
// 7. DATA API
// ==================================================
// GET    /api/data       - Soma data za umma
// GET    /api/data/mine  - Soma data zako
// POST   /api/data       - Ongeza data
// PATCH  /api/data/:id   - Hariri data yako
// DELETE /api/data/:id   - Futa data yako
//
// Ulinzi wa kuingia na umiliki wa data
// unashughulikiwa kwenye data.routes.js.
app.use('/api/data', dataRoutes);

// ==================================================
// 8. NJIA ISIYOPATIKANA
// ==================================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Njia uliyoomba haipo.'
    });
});

// ==================================================
// 9. KUSHUGHULIKIA MAKOSA
// ==================================================
app.use((err, req, res, next) => {

    if (res.headersSent) {
        return next(err);
    }

    // JSON isiyo sahihi
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
            success: false,
            message: 'JSON uliyotuma si sahihi.'
        });
    }

    // Data imezidi kiwango
    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            success: false,
            message: 'Data uliyotuma imezidi kiwango kinachoruhusiwa.'
        });
    }

    // Rekodi ya hitilafu kwa mazingira ya development
    if (process.env.NODE_ENV !== 'production') {
        console.error('Backend error:', err);
    }

    // Ujumbe wa jumla usiofichua taarifa za ndani
    return res.status(500).json({
        success: false,
        message: 'Hitilafu ya ndani ya server imetokea.'
    });
});

// ==================================================
// 10. EXPORT APP
// ==================================================
module.exports = app;
