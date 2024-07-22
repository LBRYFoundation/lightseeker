export const style = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    underscore: "\x1b[4m",
    blink: "\x1b[5m",
    reverse: "\x1b[7m",
    hidden: "\x1b[8m",
    // Foreground (text) colors
    fg: {
      black: "\x1b[30m",
      red: "\x1b[31m",
      green: "\x1b[32m",
      yellow: "\x1b[33m",
      blue: "\x1b[34m",
      magenta: "\x1b[35m",
      cyan: "\x1b[36m",
      white: "\x1b[37m",
      crimson: "\x1b[38m"
    },
    // Background colors
    bg: {
      black: "\x1b[40m",
      red: "\x1b[41m",
      green: "\x1b[42m",
      yellow: "\x1b[43m",
      blue: "\x1b[44m",
      magenta: "\x1b[45m",
      cyan: "\x1b[46m",
      white: "\x1b[47m",
      crimson: "\x1b[48m"
    }
};
  

export const getLogger = (name)=> {
    return {
        info: logger("info", name, style.fg.cyan),
        warn: logger("warn", name, style.fg.yellow),
        err: logger("error", name, style.fg.red),
        debug: process.env.NODE_ENV === "development" ? logger("debug", name, style.fg.magenta) : ()=>{},
    }
}

function logger(type, name, color) {
    return (msg)=>{
        process.stdout.write(`${color}[${type.toUpperCase()}]${style.reset}\t${name}: `);
        return console[type](msg);
    }
}