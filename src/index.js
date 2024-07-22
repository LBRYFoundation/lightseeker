import config from './config.js';
import meilisearch from './utils/meilisearch.js';
await meilisearch.start([config.indexName]); // Make sure MeiliSearch is connected before starting up fully

import { getLogger } from './utils/logger.js';
import state from './utils/state.js';
import Sync from './services/Sync.js';
import { app } from './api.js';

const logger = getLogger("MAIN");

const services = [
    Sync
]

function startServices() { return Promise.all(services.map(service => service.start())); }

function stopServices() { return Promise.all(services.map(service => service.stop())); }

startServices();


// logger.debug(config);

// await state.start();
// await meilisearch.start([{
//     name: config.indexName,
//     primaryKey: "id"
// }]);
// Sync.start(); // Start the claimSync service

// async function gracefulShutdown() {
//     logger.info('Shutting down gracefully...');

//     try {
//         await stopServices();
//         console.log('All services stopped.');
//         process.exit(0);
//       } catch (error) {
//         console.error('Error stopping services:', error);
//         process.exit(1);
//       }
// }

// process.once('beforeExit', async ()=>{
//     console.log("ss");
//     await stopServices();
//     process.exit(0);
// });

// process.once('SIGTERM', gracefulShutdown);




// process.on('SIGTERM', gracefulShutdown);
  
// process.on('SIGINT', gracefulShutdown);

// process.stdin.resume();