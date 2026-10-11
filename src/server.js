'use strict';

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Aina ya data inayoruhusiwa kwenye JSON requests.
app.use(express.json({
    limit: '100kb'
}));

// Vichwa vya msingi vya usalama wa HTTP.
app.use(helmet());

// Zuia maombi mengi kupita kiasi kwa muda mfupi.
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

// Taarifa za msingi za API.
app.get('/api', (req, res) => {
    res.status(200).json({
        success: true,
        name: 'backend',
        message: 'Backend API inapatikana.',
        version: '1.0.0'
    });
});

// Health check: kuangalia kama server inafanya kazi.
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'healthy',
        service: 'backend'
    });
});

// Njia yoyote ambayo haipo.
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

    if (NODE_ENV !== 'production') {
        console.error('Backend error:', err.message);
    }

    return res.status(500).json({
        success: false,
        message: 'Hitilafu ya ndani ya server imetokea.'
    });
});

// Anzisha server.
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server imeanza kwenye port ${PORT}`);
});

// Kufunga server kwa utaratibu.
function shutdown() {
    console.log('Backend inafungwa...');

    server.close(() => {
        process.exit(0);
    });

    setTimeout(() => {
        process.exit(1);
    }, 10000).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
