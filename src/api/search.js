import { Hono } from "hono"
import { Buffer } from 'node:buffer';

import config from "../config.js";
import meilisearch from '../utils/meilisearch.js';
import processQueries from "../utils/processQueries.js";
import { getLogger } from "../utils/logger.js";

const logger = getLogger("/search");

await meilisearch.start();

const index = await meilisearch.getIndex(config.indexName);

const router = new Hono()

router.get('/', async (c)=>{
    // { s, channel, size, from, nsfw, contentType, mediaType, claimType }
    let q;

    try {
        q = processQueries(c.req.queries());
    } catch (err) {
        return c.json({ success: false, error: err, data: null});
    }

    if (q.error) return c.json({ success: false, error: q.error, data: null});

    const queries = q.queries;

    logger.debug(queries)

    // Here, we are only interested in the queries that are indexFilters
    const filters = Object.fromEntries(Object.entries(queries).
    filter(([key, value]) => config.meilisearch.filters.includes(key)));

    const results = await index.search(queries.s, {
        filter: Object.keys(filters).map(q=> {
            switch (typeof filters[q]) {
                case 'object':
                    return filters[q].map(f=> `${q} = "${f}"` ).join(' OR ');
                case 'string':
                    return `${q} = "${filters[q]}"`;
                default:
                    return `${q} = ${filters[q]}`;
            }
        }),
        sort: [
            "effective_amount:desc",
            "reposts:desc",
            "release_time:desc"
        ],
        offset: queries.from,
        limit: queries.size
    });

    const hits = results.hits.map(hit=>{
        // return hit;
        if (queries.resolve) return {
            channel: hit.channel,
            channel_claim_id: hit.channel_id,
            claimId: hit.claim_id,
            duration: hit.duration,
            fee: hit.fee,
            name: hit.name,
            release_time: hit.release_time,
            thumbnail_url: hit.thumbnail_url,
            title:  hit.title,
            reposts: hit.reposts,
            is_nsfw: hit.is_nsfw
            // effective_amount: hit.effective_amount
            // tags: hit.tags
        }
        else return {
            claimId: hit.claim_id,
            name: hit.name,
        };
    })

    return c.json(hits);
    // const claims = await index.search(c.req.query)
});

export default router;