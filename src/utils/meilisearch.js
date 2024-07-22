import { MeiliSearch } from 'meilisearch';
import config from '../config.js';
import { isEqual } from './common.js';
import { getLogger } from './logger.js';

const logger = getLogger("MeiliSearch");

class Meili {
    #enabled;
    #starting;
    #tasks;

    constructor() {
        this.#enabled = false;
        this.#starting = false;
        this.#tasks = 0;
    }

    async stop() {
        await new Promise((resolve, reject)=>{
            const interval = setInterval(()=>{
                if (this.#tasks <= 0) {
                    clearInterval(interval);
                    resolve();
                }
                logger.info(`Waiting for ${this.#tasks} tasks to finish before shutting down...`);
            }, 1000);
        });

        logger.info(`Shutting down...`);
    }

    async #started() {
        await new Promise((resolve, reject)=>{
            const interval = setInterval(()=>{
                if (this.#enabled) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        });
    }

    // Make sure that MeiliSearch is configured correctly
    async start() {
        const indexes = [config.indexName];
        if (this.#enabled || this.#starting) return await this.#started();
        this.#starting = true;

        // Make sure we have a healthy connection to MeiliSearch before we continue
        await new Promise(async (resolve, reject)=>{
            logger.debug(config.meilisearch.apiKey);
            const check = async ()=>{
                try {
                    this.client = new MeiliSearch({
                        host: config.meilisearch.host.href,
                        apiKey: config.meilisearch.apiKey,
                    });

                    if (await this.client.health()) return true;
                } catch (err) {
                    logger.err(`Could not connect to ${config.meilisearch.host.href}`);
                }
            };

            if (await check()) return resolve();

            const interval = setInterval(async ()=>{
                if (await check()) {
                    clearInterval(interval);
                    return resolve();
                }
            }, 5000)
        });

        logger.info(`Successfully connected to ${config.meilisearch.host.href}`);

        for (let i = 0; i < indexes.length; i++) {
            // Make sure that the claims index exists
            const index = await this.getIndex(indexes[i]);
            
            // Ensure that we have the correct filters configured
            await this.#ensureFilters(index, config.meilisearch.filters);

            await this.#ensurePrimaryKey(index, "id");

            // Check sortableAttributes
            await this.#ensureSortableAttributes(index, config.meilisearch.sortableAttributes);
        }

        this.#enabled = true;
        this.#starting = false;
    }

    updateDocuments(index, {add, remove}) {
        return new Promise(async (resolve, reject)=>{
            let operation;
            let task;

            const indexName = (await index.getRawInfo()).uid;
    
            try {
                operation = await index.addDocuments(add);
                task = await this.#waitForTask(operation.taskUid, `add ${add.length} documents in '${indexName}'`);
        
                operation = await index.deleteDocuments(remove);
                task = await this.#waitForTask(operation.taskUid, `delete ${remove.length} documents in '${indexName}'`);
            } catch (err) {
                logger.err(err);
                reject();
            }

            resolve();
        });
    }

    getTasks(parameters={}) {
        return this.client.getTasks(parameters);
    }

    async getIndex(indexName) {
        let index;
        
        try {
            index = await this.client.getIndex(indexName);
        } catch {

            let task;
            // If we got here, the index doesn't exist
            logger.info(`Index '${indexName}' does not exist, creating...`);

            // Create the index and wait for it to complete
            const creation = await this.client.createIndex(indexName);
            task = await this.#waitForTask((creation).taskUid, `create index '${indexName}'`);

            // We still need to return the index
            index = await this.client.getIndex(indexName);
        }

        return index;
    }

    async #ensureSortableAttributes(index, sortableAttributes) {
        const info = await index.getRawInfo();
        const indexName = info.uid;
        logger.info(`Checking sortableAttributes for '${indexName}'...`);


        if (!isEqual(await index.getSortableAttributes(), sortableAttributes)) {
            logger.info(`sortableAttributes for '${indexName}' is not correct, updating...`);

            // Wait for the update to finish
            let operation = await index.updateSortableAttributes(sortableAttributes);
            const task = await this.#waitForTask(operation.taskUid, `update sortableAttributes for '${indexName}'`);

        } else {
            logger.info(`sortableAttributes for '${indexName}' is correct.`);
        }

    }

    async #ensurePrimaryKey(index, primaryKey) {
        const info = await index.getRawInfo();
        const indexName = info.uid;
        logger.info(`Checking primaryKey for '${indexName}'...`);

        if (info.primaryKey !== primaryKey) {
            logger.info(`primaryKey for '${indexName}' is not correct, updating...`);

            // Wait for the update to finish
            let operation = await index.update({primaryKey});
            const task = await this.#waitForTask(operation.taskUid, `update primaryKey for '${indexName}'`);
        } else {
            logger.info(`primaryKey for '${indexName}' is correct.`);
        }

    }

    // Make sure we have the correct filters configured
    async #ensureFilters(index, filters) {
        const indexName = (await index.getRawInfo()).uid;
        logger.info(`Checking filters for '${indexName}'...`);

        if (!isEqual(await index.getFilterableAttributes(), filters)) {
            logger.info(`Filters for '${indexName}' is not correct, updating...`);

            // Wait for the update to finish
            let operation = await index.updateFilterableAttributes(filters);
            const task = await this.#waitForTask(operation.taskUid, `update filters for '${indexName}'`);

        } else {
            logger.info(`Filters for '${indexName}' is correct.`);
        }
    }

    #waitForTask(uid, msg="") {
        return new Promise((resolve, reject)=>{
            let task;
            let time = new Date().getTime();

            this.#tasks++;
            
            const startTime = time;

            const interval = setInterval(async ()=>{
                try {
                    task = await this.client.getTask(uid);
                } catch (err) {
                    reject(err);
                }

                // Check the current status
                switch (task.status) {
                    case 'succeeded':
                        logger.info(`${task.status.toUpperCase()} task ${task.uid}: ${msg || 'no message'}, took ${(new Date().getTime() - startTime)/1000}s`);
                        this.#tasks--;
                        clearInterval(interval);
                        resolve(task);
                        return;
                    case 'failed':
                    case 'canceled':
                        logger.err(`${task.status.toUpperCase()} task ${task.uid}: ${msg || 'no message'}!`);
                        this.#tasks--;
                        clearInterval(interval);
                        reject(task);
                        return;
                    case 'processing':
                    case 'enqueued':
                    default:
                        break;
                    };

                    // Log the status of the task every 10 seconds
                    if (new Date().getTime() >= time + 10000) {
                        logger.warn(`${task.status.toUpperCase()} task ${task.uid}: ${msg || 'no message'}, ${(new Date().getTime() - startTime)/1000}s elapsed`);
                        time = new Date().getTime();
                    }


                }, config.checkTaskInterval);
        });
    };
};

const client = new Meili();
export default client;