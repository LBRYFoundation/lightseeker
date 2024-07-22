import config from "../config.js";
// import chainquery from "../utils/chainquery.js";
import provider from "../providers/Chainquery.js";
import state from "../utils/state.js";
import { partition, sleep } from "../utils/common.js";
import meilisearch from "../utils/meilisearch.js";
import { getLogger } from "../utils/logger.js";
import constants from "../constants.js";

const logger = getLogger("Sync");

// The states for ClaimSync
export const syncStates = Object.freeze({
    INACTIVE: 0,
    STARTING: 1,
    RUNNING: 2,
    FAILING: 3,
    FETCHING: 4,
    PUSHING: 5,
    SYNCED: 6
});

const query = (time, lastID, MaxClaimsInCall) => {
    return `SELECT c.id, 
        c.name, 
        p.name AS channel, 
        p.claim_id AS channel_id, 
        c.bid_state, c.effective_amount, 
        COALESCE(p.effective_amount,1) AS certificate_amount, 
        c.claim_id, 
        c.content_type, 
        c.is_nsfw as nsfw, 
        c.title, 
        c.author, 
        c.description, 
        c.claim_type, 
        c.value_as_json AS value 
        FROM claim c LEFT JOIN claim p 
        on p.claim_id = c.publisher_id 
        WHERE c.id >${lastID} AND
        c.modified_at >='${time}' 
        ORDER BY c.id LIMIT ${MaxClaimsInCall}`;
}
    
class Sync {
    #index;
    #status;
    #tasks;
    #enabled;

    constructor() {
        this.meilisearch = meilisearch;
        this.#enabled = false;
        this.#setStatus(syncStates.INACTIVE);
    }

    get enabled() {
        return this.#enabled;
    }

    async stop() {
        if (this.#enabled) return;

        logger.info("Shutting down...");
        await this.meilisearch.stop();
        this.#enabled = false;
        this.#setStatus(syncStates.INACTIVE);
    }

    async start() {
        this.#setStatus(syncStates.STARTING);
        logger.info("Starting...");

        await state.start();
        
        await provider.start();


        
        // Make sure that MeiliSearch is configured correctly before continuing

        this.#index = await this.meilisearch.getIndex(config.indexName);

        if (!this.#enabled) this.#enabled = true;
        this.#setStatus(syncStates.RUNNING);

        this.#loop();
    }

    // async #getTasks(parameters = {}) {
    //     logger.info(await this.meilisearch.getTasks(parameters));
    // }
    
    async #loop() {
        logger.info("Starting to sync claims...");

        let claims = 0;
        let size = 0;
        while (this.#enabled) {
            while (claims < config.maxClaimsToProcessPerIteration && this.#enabled) {
                this.#setStatus(syncStates.RUNNING);
                try {
                    size = await this.#getClaims();
                } catch (err) {
                    continue; // Let's try again
                }
                
                claims += size;
                
                // If the size is less than batchSize, we are fully synced
                if (size < config.batchSize) break;
                
            }
            
            claims = 0;
            
            if (!this.#enabled) return await state.save();
            
            if (size < config.batchSize) {
                this.#setStatus(syncStates.SYNCED);
                state.set("lastSyncTime", state.get("startSyncTime"));
                state.set("lastId", 0);
                logger.info(`We are fully synced! Sleeping for ${config.sleepTimeAfterFullSync / (60 * 1000)} minutes...`);
                await sleep(config.sleepTimeAfterFullSync);
            }

            await state.save();
        }
    }

    async #getClaims() {
        let claims;
        let size = 0;

        this.#setStatus(syncStates.FETCHING);

        logger.info(`Fetching new claims...`);

        // Ask for new claims from the provider
        try {
            claims = await provider.fetchClaims();
        } catch (err) {
            logger.err(err);
            logger.err(`Failed to fetch claims, trying again in ${config.failedChainquerySleep / 1000}s...`);
            this.#setStatus(syncStates.FAILING);
            await sleep(config.failedChainquerySleep);
            throw new Error(err);
        }

        size = claims.length;

        // Remove claims without value
        claims = claims.filter((claim)=> claim.value).map((claim)=>{
            delete claim.value;
            return claim;
        });

        // Split tags into array
        claims = claims.map(claim=>{
            return {...claim, tags: claim.tags ? claim.tags.split(', ') : null};
        });

        // Separate claims (we need to remove claims that are abandoned, expired or blocked)
        const [add, remove] = partition(claims, (claim=>{
            return !(claim.bid_state === constants.CLAIM_BID_STATES.SPENT || claim.bid_state === constants.CLAIM_BID_STATES.EXPIRED);
        }));


        logger.info(`Pushing ${size} claims to DB...`);
        this.#setStatus(syncStates.PUSHING);

        // Update the MeiliSearch index
        await this.meilisearch.updateDocuments(this.#index, {add, remove: await remove.map(async claim=>{
            return claim[config.meilisearch.primaryKey];
        })});

        // state.set("lastId", claims[claims.length - 1].id);

        return size;
    }

    #setStatus(status) {
        this.#status = status;
    }

    get status() {
        return Object.keys(syncStates).find(key =>
            syncStates[key] === this.#status);    
    }

    get synced() {
        return this.status === syncStates.SYNCED;
    }

}

export default new Sync();