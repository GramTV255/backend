'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
    pool,
    closeDatabaseConnection
} = require('./pool');

async function migrate() {
    const schemaPath = path.join(__dirname, 'schema.sql');

    if (!fs.existsSync(schemaPath)) {
        throw new Error('Database schema file haipo.');
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');

    if (!schema.trim()) {
        throw new Error('Database schema file haina SQL.');
    }

    console.log('Database migration inaanza...');

    await pool.query(schema);

    console.log('Database migration imekamilika.');
}

migrate()
    .catch((error) => {
        // Usichapishe taarifa za siri za muunganisho.
        console.error(
            'Database migration imeshindwa:',
            error.message
        );

        process.exitCode = 1;
    })
    .finally(async () => {
        try {
            await closeDatabaseConnection();
        } catch (error) {
            console.error(
                'Imeshindikana kufunga database connection.'
            );

            process.exitCode = 1;
        }
    });
