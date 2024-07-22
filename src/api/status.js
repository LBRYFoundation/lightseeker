import { Hono } from "hono"

import meilisearch from '../utils/meilisearch.js';
import { getSize } from "../utils/common.js";
import config from "../config.js";
import ClaimSync from "../services/Sync.js";

const router = new Hono()

router.get('/', async (c)=>{
    const stats = await meilisearch.client.getStats();
    // const storage = 
    const index = await meilisearch.getIndex(config.indexName);
    // const indexStats ();
    const info = await index.getStats();
    return c.json({
        spaceUsed: Object.values(getSize(stats.databaseSize)).join("") + "B",
        claimsInIndex: stats.indexes[config.indexName].numberOfDocuments,
        totalSearches: 0,
        isIndexing: info.isIndexing,
        synced: ClaimSync.synced,
        syncStatus: ClaimSync.status,
        purgeLists: config.purgeLists,
        database: { ...await meilisearch.client.getVersion(), name: "meilisearch"}
    });
    // const claims = await index.search(c.req.query)
});

export default router;