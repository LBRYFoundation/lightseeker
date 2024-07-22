import config from "../config.js";

// Base query skeleton
const baseQuery = {
    table: "claim c",
    fields: [
        'c.id',
        'c.title', 
        'c.name', 
        'c.claim_id', 
        'c.thumbnail_url', 
        'c.description', 
        'c.language',
        'c.release_time', 
        'COALESCE(c.audio_duration, c.duration) AS duration', 
        'c.frame_height', 
        'c.frame_width',
        'c.license', 
        'c.is_nsfw', 
        'c.fee', 
        'c.source_name AS file_name', 
        `SUBSTRING_INDEX(
            COALESCE(c.content_type, c.source_media_type), 
            '/', 
            1 
        ) AS media_supertype`,
        `SUBSTRING_INDEX(
            COALESCE(c.content_type, 
            c.source_media_type), 
            '/', 
            -1
        ) AS media_subtype`, 
        'c.effective_amount / 1e8 AS effective_amount', 
        `(
            SELECT COUNT(*) AS reposts 
            FROM claim 
            WHERE 
                type = "claimreference" 
                AND claim_reference = c.claim_id
        ) AS reposts`, 
        `(
            SELECT GROUP_CONCAT(tag SEPARATOR ', ') AS tags 
            FROM claim_tag ct 
            LEFT JOIN tag t 
                ON t.id = ct.tag_id 
            WHERE 
                claim_id = c.claim_id 
        ) AS tags`, 
        'c.claim_reference AS reposted_claim_id', 
        'c.author', 
        'p.title AS channel_title', 
        'p.name AS channel_name', 
        'p.claim_id AS channel_id', 
        'COALESCE(p.effective_amount / 1e8,1) AS certificate_amount', 
        'c.value_as_json AS value', 
        'c.modified_at', 
        `CASE c.bid_state 
            WHEN 'Controlling' THEN 0 
            WHEN 'Accepted' THEN 1 
            WHEN 'Active' THEN 2 
            WHEN 'Spent' THEN 3 
            WHEN 'Expired' THEN 4 
        END AS bid_state`, 
        `CASE c.type 
            WHEN 'channel' THEN 0 
            WHEN 'stream' THEN 1 
            WHEN 'claimreference' THEN 2 
            WHEN 'claimlist' THEN 3 
        END AS type`
    ].map(field=> field.replaceAll('  ', '').replaceAll('\n', ' ')).join(','),

    joins: [
        "LEFT JOIN claim p ON p.claim_id = c.publisher_id",
        "LEFT JOIN claim_tag ct ON ct.claim_id = c.claim_id",
        "LEFT JOIN tag t ON t.id = ct.tag_id"
    ].join(" ")
}

export default (lastId, params) => {
    const limit = params.limit || config.batchSize;
    const where = [];
    if (params.claim_id) where.push(`c.claim_id IN (${params.claim_id.map(id=>`'${id}'`).join(',')})`);
    if (params.channel_id) where.push(`c.publisher_id IN (${params.channel_id.map(id=>`'${id}'`).join(',')})`);
    where.push(`c.id > ${lastId}`);

    return `SELECT ${baseQuery.fields} FROM ${baseQuery.table} ${baseQuery.joins} ${where.length ? `WHERE ${where.join(' AND ')}` : ""} ORDER BY c.id LIMIT ${limit}`;
}