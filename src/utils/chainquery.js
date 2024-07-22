import config from "../config.js";

config.CHAINQUERY.pathname = "/api/sql";

export default (query) => {
    return new Promise(async (resolve, reject)=>{
        let resp;
        try {
            config.CHAINQUERY.searchParams.set("query", query);
            resp = await (await fetch(config.CHAINQUERY.href));

            resolve(resp.json());
        } catch (err) {
            reject(err);
        }
    })
}