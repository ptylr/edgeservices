'use strict';

const AWS = require('aws-sdk');
const s3 = new AWS.S3();

let LRU = require("lru-cache")
  , options = { max: 1000
              , length: function (_n, _key) { return 1 }
              , dispose: function (_key, _n) { ; }
              , maxAge: 1000 * 60 * 5 }
  , uriCache = new LRU(options);

const exists = (host, path) => new Promise((resolve, reject) => {

    const cacheKey = host + path;
    let result = uriCache.get(cacheKey);
    if (typeof result !== "undefined") {
        console.log(`S3CHECKER: Cached [${path}] exists = ${result}`);
        resolve(result);
        return;
    }

    // DEBUG
    // let sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    // sleep(500).then(() => {
    //     if (path === "/picture.jpg") {
    //         console.log(`S3CHECKER: [${path}] exists = false`);
    //         uriCache.set(cacheKey, false);
    //         resolve(false);
    //     } else {
    //         console.log(`S3CHECKER: [${path}] exists = true`);
    //         uriCache.set(cacheKey, true);
    //         resolve(true);
    //     }
    // });
    //return;

    if (path.charAt(0) === '/') path = path.substr(1);
    var params = {
        Bucket: host.replace(".s3.amazonaws.com", ""),
        Key: path
    };
    s3.headObject(params, (err, _data) => {
        if (err) {
            if (err.code === "NotFound") {
                console.log(`S3CHECKER: [${path}] exists = false`);
                uriCache.set(cacheKey, false);
                resolve(false);
            }
            else {
                console.error(err, err.stack)
                reject(err);
            }
        }
        else {
            console.log(`S3CHECKER: [${path}] exists = true`);
            uriCache.set(cacheKey, true);
            resolve(true);
        }
    });
});

const isDirectory = async (host, path) => {
    if (path.charAt(path.length - 1) !== "/") {
        console.log(`S3CHECKER: [${path}] is not a directory`);
        return false;
    }
    return await exists(host, path);
};

const isFile = async (host, path) => {
    if (path.charAt(path.length - 1) === "/") {
        console.log(`S3CHECKER: [${path}] is not a file`);
        return false;
    }
    return await exists(host, path);
};

//module.exports.exists = exists;
module.exports.isDirectory = isDirectory;
module.exports.isFile = isFile;