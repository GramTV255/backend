'use strict';

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Soma JSON requests.
app.use(express.json({
    limit: '100kb'
}));

// Vichwa vya msingi vya usalama.
app.use(helmet());

// Punguza maombi mengi kupita kiasi.
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

// Taarifa za API.
app.get('/api', (req, res) => {
    res.status(200).json({
        success: true,
        name: 'backend',
        message: 'Backend API inapatikana.',
        version: '1.0.0'
    });
});

// Health check.
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'healthy',
        service: 'backend'
    });
});

// Njia isiyopatikana.
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Njia uliyoomba haipo.'
    });
});

// Kushughulikia makosa.
app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
            success: false,
            message: 'JSON uliyotuma si sahihi.'
        });
    }

    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            success: false,
            message: 'Data uliyotuma imezidi kiwango kinachoruhusiwa.'
        });
    }

    if (process.env.NODE_ENV !== 'production') {
        console.error('Backend error:', err.message);
    }

    return res.status(500).json({
        success: false,
        message: 'Hitilafu ya ndani ya server imetokea.'
    });
});

module.exports = app;
