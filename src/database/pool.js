'use strict';

const { Pool } = require('pg');

// ==================================================
// 1. THIBITISHA DATABASE CONFIGURATION
// ==================================================

const requiredVariables = [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USERNAME',
    'DB_PASSWORD'
];

function validateDatabaseConfig() {
    const missing = requiredVariables.filter((name) => {
        return !process.env[name];
    });

    if (missing.length > 0) {
        throw new Error(
            `Database configuration is missing: ${missing.join(', ')}`
        );
    }

    const port = Number(process.env.DB_PORT);

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('DB_PORT configuration is invalid.');
    }
}

// ==================================================
// 2. TENGENEZA CONNECTION POOL
// ==================================================

let pool = null;

function getPool() {
    // Unda pool pale tu inapohitajika.
    // Hii inaruhusu server kuanza kabla ya database
    // kuwekwa, lakini maombi ya database yatahitaji
    // configuration sahihi.
    if (pool) {
        return pool;
    }

    validateDatabaseConfig();

    pool = new Pool({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        database: process.env.DB_NAME,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,

        // TLS imewashwa.
        // Kwa uzalishaji, tumia CA certificate
        // inayotolewa na mtoa huduma inapowezekana.
        ssl: {
            rejectUnauthorized: false
        },

        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
    });

    pool.on('error', () => {
        // Usichapishe nywila au taarifa za connection.
        console.error(
            'Hitilafu isiyotarajiwa imetokea kwenye PostgreSQL connection pool.'
        );
    });

    return pool;
}

// ==================================================
// 3. KAGUA DATABASE CONNECTION
// ==================================================

async function checkDatabaseConnection() {
    const db = getPool();

    const result = await db.query(
        'SELECT NOW() AS server_time'
    );

    return {
        connected: true,
        serverTime: result.rows[0].server_time
    };
}

// ==================================================
// 4. FUNGA DATABASE CONNECTION
// ==================================================

async function closeDatabaseConnection() {
    if (pool) {
        const currentPool = pool;
        pool = null;

        await currentPool.end();
    }
}

// ==================================================
// 5. EXPORT
// ==================================================

module.exports = {
    get pool() {
        return getPool();
    },

    getPool,
    checkDatabaseConnection,
    closeDatabaseConnection
};
