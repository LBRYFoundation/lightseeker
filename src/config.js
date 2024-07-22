import YAML from 'yaml'
import fs from 'fs';
import path from 'path';
import { getLogger } from './utils/logger.js';

const logger = getLogger("Config");

// Grab the config file
let config = {};

// Try read file
try {
    config = YAML.parse(await fs.promises.readFile(process.env.CONFIG_FILE ? path.join(process.env.CONFIG_FILE, "config.yml") : 'config.yml', { encoding: 'UTF-8' }) || "");
    logger.info("Loaded configuration file.");
} catch (err) {
    logger.info("No configuration file found. Using defaults...");
}

logger.debug(config);

function ensureAddress(host) {
    const url = new URL((host.startsWith('https://') || host.startsWith('http://')) ? host : "http://" + host);
    return url;
} 

export default {
    dataDirectory: process.env.DATA_DIR || process.cwd(),
    batchSize: config.batchSize || 5000,
    maxClaimsToProcessPerIteration: 100000,
    indexName: "claims",
    checkTaskInterval: 200,
    sleepTimeAfterFullSync: 2 * 60 * 1000,
    failedChainquerySleep: 5000,
    port: process.env.PORT || config.apiPort || 3000,
    purgeLists: config.purgeLists || [],
    CHAINQUERY: ensureAddress(process.env.CHAINQUERY_HOST || config.chainqueryHost || "https://chainquery.lbry.com"),
    meilisearch: {
        host: ensureAddress(process.env.MEILISEARCH_HOST || config.meilisearchHost || "http://127.0.0.1:7700"),
        apiKey: process.env.MEILISEARCH_API_KEY || config.meilisearchAPIKey || "masterKey",
        filters: ["is_nsfw", "claim_id", "channel_id", "content_type", "media_type", "claim_type", "duration", "width", "height", "tags"],
        sortableAttributes: ["bid_state", "fee", "release_time", "reposts", "effective_amount", "certificate_amount"],
        purgeLists: config.purgeLists || [],
        primaryKey: "claim_id"
    }
}