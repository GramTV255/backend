'use strict';


const { Pool } = require('pg');


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


validateDatabaseConfig();


const pool = new Pool({
host: process.env.DB_HOST,
port: Number(process.env.DB_PORT),
database: process.env.DB_NAME,
user: process.env.DB_USERNAME,
password: process.env.DB_PASSWORD,


// Wasmer PostgreSQL inahitaji TLS.
// Certificate verification imezimwa kwa sababu ya private CA.
// Muunganisho wa TLS wenyewe unabaki umewashwa.
ssl: {
    rejectUnauthorized: false
},

max: 10,
idleTimeoutMillis: 30000,
connectionTimeoutMillis: 10000



});


pool.on('error', (error) => {
// Usichapishe taarifa za muunganisho au nywila.
console.error(
'Hitilafu isiyotarajiwa imetokea kwenye PostgreSQL connection pool.'
);
});


async function checkDatabaseConnection() {
const result = await pool.query(
'SELECT NOW() AS server_time'
);


return {
    connected: true,
    serverTime: result.rows[0].server_time
};



}


async function closeDatabaseConnection() {
await pool.end();
}


module.exports = {
pool,
checkDatabaseConnection,
closeDatabaseConnection
};


