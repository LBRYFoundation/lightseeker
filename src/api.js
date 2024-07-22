import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { getSize } from './utils/common.js';
import config from './config.js';
import { getLogger, style } from './utils/logger.js';

import search from './api/search.js';
import status from './api/status.js';
import autocomplete from './api/autocomplete.js';

const logger = getLogger("API");

export const app = new Hono()
app.get('/', (c) => c.json("Welcome to Lightseeker!"));

app.use(async (c, next)=> {
    logger.info(`<-- ${style.bright}${c.req.method}${style.reset} ${c.req.path}`);

    const start = new Date().getTime();

    await next();

    logger.info(`--> ${style.bright}${c.req.method}${style.reset} ${c.req.path} ${c.res.status} ${new Date().getTime() - start}ms ${Object.values(getSize((await c.res.arrayBuffer()).byteLength)).join('') + "B"}`);
});

app.route('/search', search);
app.route('/status', status);
app.route('/autocomplete', autocomplete);

serve({
    fetch: app.fetch,
    port: config.port,
})

logger.info("Listening on port: " + config.port);