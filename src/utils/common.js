export function isEqual(a, b) {
    return a.sort().join() === b.sort().join();
}

export function partition(array, callback){
    return array.reduce((result, element, i)=>{
        callback(element, i, array) 
            ? result[0].push(element) 
            : result[1].push(element);
        
            return result;
        }, [[],[]]
    );
};

export function getSize(bytes) {
    const PREFIXES = ["", "K", "M", "G", "T"];
    let i = 0;

    while (i < PREFIXES.length) {
        if (bytes < 1000) break;

        bytes /= 1024;
        i++;
    }

    return {
        size: bytes.toFixed(1),
        prefix: PREFIXES[i]
    }
}

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}