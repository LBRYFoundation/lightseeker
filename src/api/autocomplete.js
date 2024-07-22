import { Hono } from "hono"
import { Buffer } from 'node:buffer';

import config from "../config.js";
import meilisearch from '../utils/meilisearch.js';

await meilisearch.start();

const index = await meilisearch.getIndex(config.indexName);
// console.log(await index.updateFilterableAttributes(["nsfw"]));

const router = new Hono()

router.get('/', async (c)=>{
    // { s, channel, size, from, nsfw, contentType, mediaType, claimType }
    const queries = c.req.queries();

    const results = await index.search(queries.s[0], {
        filter: ['nsfw = 0', 'claim_type != 2'],
        hitsPerPage: queries.size || 9,
        offset: queries.from || 0
    });

    const hits = results.hits.map(hit=>{
        return hit.name
    })

    return c.json(hits);
    // const claims = await index.search(c.req.query)
});

export default router;