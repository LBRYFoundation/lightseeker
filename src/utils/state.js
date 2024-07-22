import fs from 'fs';
import { getLogger } from './logger.js';
import config from '../config.js';
import path from 'path';

const logger = getLogger("State");

class State {
    #store;
    #enabled;

    constructor() {
        this.#enabled = false;
    }

    get(key) {
        return this.#store[key];
    }

    set(key, value) {
        this.#store[key] = value;
    }

    async save() {
        await fs.promises.writeFile(path.join(config.dataDirectory, 'state.json'), JSON.stringify(this.#store));
        logger.info("[State] Wrote data to state.json");
    }

    async stop() {
        if (!this.#enabled) return;
        this.#enabled = false;

        await this.save();

        this.#store = {};
    }

    async start() {
        if (this.#enabled) return;
        this.#enabled = true;

        logger.info("Initializing...");

        let data;

        // Try read file
        try {
            data = await fs.promises.readFile(path.join(config.dataDirectory, 'state.json'), {
                encoding: 'utf-8'
            });
        } catch (err) {
            // File does not exist
            await fs.promises.writeFile('state.json', JSON.stringify({}));
            data = "{}";
        }

        // Try parse
        try {
            this.#store = JSON.parse(data);
            logger.info("Loaded state.json");
            logger.debug(this.#store);
        } catch (err) {
            // Don't continue if the JSON is invalid
            logger.err("[State] state.json contains invalid JSON");
            process.abort();
        }
    }
}

export default new State();