'use strict';

const errors = require("./errors");
const headers = require("./headers");
const config = require("./config");

// RegExp serialization for logging
RegExp.prototype.toJSON = function() { return this.toString() }

let LRU = require("lru-cache")
  , options = { max: 100
              , length: function (_n, _key) { return 1 }
              , dispose: function (_key, _n) { ; }
              , maxAge: 1000 * 60 * 5 }
  , configCache = new LRU(options);

module.exports.handler = (event, context, callback) => {

    const request = event.Records[0].cf.request;
    const clearCache = (request.querystring || "").indexOf("clearConfigCache") >= 0;
    const fn = context.invokedFunctionArn.split(':')[6];
    getConfig(request.headers.host[0].value, fn, clearCache)
    .then(config => {
        errors.applyRules(event, fn, config.errors).then(res => {
            event = res;
            event = headers.applyRules(event, config.headers);
            return callback(null, event.Records[0].cf.response);
        })
    })
    .catch(error => {
        console.error(error);
        // No config file, so everything is fine
        console.log("No config file was found.");
        return callback(null, event.Records[0].cf.response);
    });

};

async function getConfig(host, fn, clearCache) {
    let cfg = configCache.get(host);
    if (cfg && !clearCache) {
        console.log(`Cache hit for config for ${host}`);
    } else {
        console.log(`Cache miss for config for ${host}`);
        cfg = await config.load(host, fn);
        if (cfg) {
            configCache.set(host, cfg);
        }
    }
    return cfg;
}