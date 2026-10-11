'use strict';

require('dotenv').config();

const app = require('./app');

const PORT = Number(process.env.PORT) || 3000;

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server imeanza kwenye port ${PORT}`);
});

// Kufunga server kwa utaratibu.
function shutdown() {
    console.log('Backend inafungwa...');

    server.close((error) => {
        if (error) {
            console.error('Hitilafu wakati wa kufunga server.');
            process.exit(1);
            return;
        }

        process.exit(0);
    });

    // Usisubiri milele ikiwa server haifungi.
    setTimeout(() => {
        process.exit(1);
    }, 10000).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
