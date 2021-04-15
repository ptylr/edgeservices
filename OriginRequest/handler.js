'use strict';

const restrictedPaths = require("./restrictedPaths");
const authorize = require("./authorize");
const rewrites = require("./rewrites");
const defaultDocument = require("./defaultDocument");
const config = require("./config");

// RegExp serialization for logging
RegExp.prototype.toJSON = function() { return this.toString() }

let LRU = require("lru-cache")
  , options = { max: 100
              , length: function (_n, _key) { return 1 }
              , dispose: function (_key, _n) { ; }
              , maxAge: 1000 * 60 * 5 }
  , configCache = new LRU(options)
  , rulesCache = new LRU(options);

module.exports.handler = (event, context, callback) => {

    console.log("Event: " + JSON.stringify(event));
    console.log("Context: " + JSON.stringify(context));
    const request = event.Records[0].cf.request;
    const clearCache = (request.querystring || "").indexOf("clearConfigCache") >= 0;
    const fn = context.invokedFunctionArn.split(':')[6];
    getConfig(request.headers.host[0].value, fn, clearCache)
    .then(config => {

        let result = defaultDocument.applyRules(event, config.defaultDocument);

        result = restrictedPaths.applyRules(result, config.restrictedPaths);

        if (result && result.status) {
            // Anything with a status code goes back
            return callback(null, result);
        }

        result = authorize.applyRules(result, config.authorize);

        if (result && result.status) {
            // Anything with a status code goes back
            return callback(null, result);
        }

        const host = request.headers.host[0].value;
        let redirectRules = rulesCache.get(host);
        if (redirectRules && !clearCache) {
            console.log(`Cache hit for rules for ${host}`);
        } else {
            console.log(`Cache miss for rules for ${host}`);
            redirectRules = rewrites.parseRules(config.rewrites);
            rulesCache.set(host, redirectRules);
        }
        
        rewrites.applyRules(result, redirectRules, fn, config.defaultDocument).then((r) => {
            return callback(null, r.res);
        });
    })
    .catch(_error => {
        console.error(_error);
        // No config file, so everything is fine
        console.log("No config file was found.");
        return callback(null, request);
    })

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