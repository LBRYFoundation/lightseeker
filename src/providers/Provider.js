/* 
    This file contains an example Class of how a Provider should look like and what methods it needs to have.

*/

export default class Provider {
    #enabled;
    #start;
    #stop;

    constructor() {
        this.#enabled = false;
    }

    start() {
        if (!this.#start) throw Error("Tried to start a Provider without a '#start()' method!");
        this.running = true;
        return this.#start();
    }

    stop() {
        if (!this.#stop) throw Error("Tried to stop a Provider without a '#stop()' method!");
        this.running = false;
        return this.#stop();
    }
}