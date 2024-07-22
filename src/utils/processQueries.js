import { getLogger } from "./logger.js";

const logger = getLogger("Query");

const parseType = {
  boolean: (data)=>{
    if (!data) return true;
    if (["1", "yes", "y", "true"].includes(data)) return true;
    if (["0", "no", "n", "false"].includes(data)) return false;
  },
  list: (data)=>{ return data.split(',') }
}

const BOOLEAN_FALSE = [
    "0", "no", "n", "false"
];

const BOOLEAN_TRUE = [
    "1", "yes", "y", "true"
]

function getEscapedQuery (query) {
    // https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html#_reserved_characters
    // The reserved characters are: + - = && || > < ! ( ) { } [ ] ^ " ~ * ? : \ /
    let badCharacters  = ['+', '-', '=', '&&', '||', '>', '<', '!', '(', ')', '{', '}', '[', ']', '^', '"', '~', '*', '?', ':', '\\'];
    let escapedQuery = '';
    for (var i = 0; i < query.length; i++) {
      let char1 = query.charAt(i);
      if (badCharacters.includes(char1)) {
        escapedQuery = escapedQuery + '\\' + char1;
      } else if (i + 1 <= query.length) {
        let char2 = query.charAt(i + 1);
        if (badCharacters.includes(char1 + char2)) {
          escapedQuery = escapedQuery + '\\' + char1 + char2;
          i++;
        } else {
          escapedQuery = escapedQuery + char1;
        }
      } else {
        escapedQuery = escapedQuery + char1;
      }
    }
    return escapedQuery;
  }

function err(msg) { return { error: msg } }

export default (input)=>{

    // Hono handles multiple querystring parameters, i.e. /search?s=A&s=B --> Query s: ['A', 'B'], but we are just interested in the first one: 'A'
    Object.keys(input).map(function(key) {
        input[key] = getEscapedQuery(input[key][0]);
    })

    const queries = {};

    // if (!input.s) return err("s: cannot be blank.");

    queries.s = input.s;

    
    // Parse channel
    if (input.channel !== undefined) {
        queries.channel = input.channel.startsWith('@') ? input.channel : '@' + input.channel;
    }

    // Parse size
    if (input.size === undefined) queries.size = 10;
    else if (isNaN(input.size)) return err("size: has to be a number");
    else queries.size = parseInt(input.size);

    // Parse from
    if (input.from === undefined) queries.from = 0;
    else if (isNaN(input.from)) return err("from: has to be a number");
    else queries.from = parseInt(input.from);

    // Parse nsfw
    if (input.nsfw !== undefined) queries.is_nsfw = parseType.boolean(input.nsfw) ? 1 : 0;

    // Parse contentType
    if (input.contentType !== undefined) queries.content_type = input.contentType.split(',');

    // Parse tags
    if (input.tags !== undefined) queries.tags = parseType.list(input.tags);

    // Parse resolve
    if (input.resolve !== undefined) queries.resolve = parseType.boolean(input.resolve);

    return { queries };
}