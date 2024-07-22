import generateQuery from "../utils/generateQuery.js";
import state from "../utils/state.js";
import config from "../config.js";
import { getLogger } from "../utils/logger.js";

const logger = getLogger("Chainquery");

const statusURL = config.CHAINQUERY;
const sqlURL = config.CHAINQUERY;

statusURL.pathname = "/api/status";
sqlURL.pathname = "/api/sql";

class Chainquery {
    #enabled;

    constructor() {
        this.#enabled = false;
    }

    async start() {
        // Handle startup
        await state.start();

        if (!state.get("lastId")) state.set("lastId", 0);
        if (!state.get("lastSyncTime")) state.set("lastSyncTime", "0001-01-01 00:00:00");
        if (!state.get("startSyncTime")) state.set("startSyncTime", new Date().toISOString().slice(0, 19).replace('T', ' '));

        return await this.#statusChecker();
    }

    async #statusChecker() {
        let resp;

        // Check if chainquery is working correctly
        const check = async ()=>{
            try {
                resp = await (await fetch(statusURL.href)).json();
                return resp.success;
            } catch (err) {
                return false;
            }
        }

        const interval = setInterval(async ()=>{
            if (!this.enabled) return clearInterval(interval);
            if (!(await check())) {
                logger.err(`Cannot access chainquery on ${config.CHAINQUERY.hostname}!`);
            }
        }, 5000);


        return check();
    }

    async fetchClaims(params={}) {
        return new Promise((resolve, reject)=>{
            let resp;
            const interval = setInterval(async ()=>{
                try {
                    resp = await this.query(generateQuery(state.get("lastId"), params));

                    // If chainquery returns an error, there's something wrong with the request
                    if (resp.error) return reject(resp.error);

                    state.set("lastId", resp.data[resp.data.length - 1].id);
                    logger.info("Reached id " + state.get("lastId"));

                    clearInterval(interval);
                    resolve(resp.data);
                } catch (err) {
                    logger.err(err);
                    logger.warn(`Failed to fetch from chainquery, trying again in ${config.failedChainquerySleep / 1000}s...`);
                }

            }, config.failedChainquerySleep);
        });
    }

    query(q) {
        return new Promise(async (resolve, reject)=>{
            let resp;
            try {
                sqlURL.searchParams.set("query", q);
                resp = await fetch(sqlURL.href);
    
                resolve(resp.json());
            } catch (err) {
                reject(err);
            }
        })
    }

    get enabled() {
        return this.#enabled;
    }

    #enable() {
        this.#enabled = true;
    }

    #disable() {
        this.#enabled = false;
    }
}

export default new Chainquery();