import chainquery from "./src/utils/chainquery.js";
import { Hono } from "hono";
import { serve } from '@hono/node-server';

// Base query skeleton
const baseQuery = {
    table: "claim c",
    fields: [
        'c.id',
        'c.title', 
        'c.name', 
        'c.claim_id', 
        'c.thumbnail_url AS thumbnail', 
        'c.description', 
        'c.language',
        'c.release_time', 
        'COALESCE(c.audio_duration, c.duration) AS duration', 
        'c.frame_height AS height', 
        'c.frame_width AS width',
        'c.license', 
        'c.is_nsfw AS nsfw', 
        'c.fee', 
        'c.source_name AS file_name', 
        "SUBSTRING_INDEX(COALESCE(c.content_type, c.source_media_type), '/', 1) AS media_type",
        "SUBSTRING_INDEX(COALESCE(c.content_type, c.source_media_type), '/', -1) AS mime_type", 
        'c.effective_amount / 1e8 AS effective_amount', 
        '(SELECT COUNT(*) AS reposts FROM claim WHERE type = "claimreference" AND claim_reference = c.claim_id) AS reposts', 
        `(SELECT GROUP_CONCAT(tag SEPARATOR ', ') AS tags FROM claim_tag ct LEFT JOIN tag t ON t.id = ct.tag_id WHERE claim_id = c.claim_id 
        ) AS tags`, 
        'c.claim_reference AS reposted_claim_id', 
        'c.author', 
        'p.title AS channel_title', 
        'p.name AS channel_name', 
        'p.claim_id AS channel_id', 
        'COALESCE(p.effective_amount / 1e8,1) AS certificate_amount', 
        'c.value_as_json AS value', 
        'c.modified_at', 
        `CASE 
            WHEN c.bid_state = 'Controlling' THEN 0 
            WHEN c.bid_state = 'Accepted' THEN 1 
            WHEN c.bid_state = 'Active' THEN 2 
            WHEN c.bid_state = 'Spent' THEN 3 
            WHEN c.bid_state = 'Expired' THEN 4 
        END AS bid_state`, 
        `CASE 
            WHEN c.type = 'channel' THEN 0 
            WHEN c.type = 'stream' THEN 1 
            WHEN c.type = 'claimreference' THEN 2 
            WHEN c.type = 'claimlist' THEN 3 
        END AS type`
    ].map(field=> field.replaceAll('  ', '').replaceAll('\n', ' ')).join(','),

    joins: [
        "LEFT JOIN claim p ON p.claim_id = c.publisher_id",
        // "LEFT JOIN claim_tag ct ON ct.claim_id = c.claim_id", 
        // "LEFT JOIN tag t ON t.id = ct.tag_id"
    ].join(" ")
}

function generateQuery(params={}) {
    const limit = params.limit || 5000;
    const where = [];
    if (params.claim_id) where.push(`c.claim_id IN (${params.claim_id.map(id=>`'${id}'`).join(',')})`);
    if (params.channel_id) where.push(`c.publisher_id IN (${params.channel_id.map(id=>`'${id}'`).join(',')})`);

    // where.push(`t.tag IS NOT NULL`);

    return `SELECT ${baseQuery.fields} FROM ${baseQuery.table} ${baseQuery.joins} ${where.length ? `WHERE ${where.join(' AND ')}` : ""} ORDER BY c.id DESC LIMIT ${limit}`;
}

// const app = new Hono();

// app.get('/', async (c) => {
//     const params = {};
//     Object.keys(c.req.queries()).map(function(key) {
//         params[key] = c.req.queries()[key][0].split(',');
//     })

//     // console.log(params);

//     const query = generateQuery(params);
//     // console.log(query);

//     const resp = await chainquery(query);
//     return c.json({ ...resp, results: resp.data ? resp.data.length : 0, limit: params.limit || 5000})
// });

// serve(app);

// const query = `
// SELECT
// ct.*, t.tag

// FROM claim_tag ct
// LEFT JOIN tag t ON t.id = ct.tag_id
// LIMIT 20
// `;
const query = generateQuery();

const resp = await chainquery(query);

// console.log({ ...resp, results: resp.data ? resp.data.length : 0, limit: 5000});

console.log("Query: " + query.replaceAll('\n', ' '));

console.log("done");