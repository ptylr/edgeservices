'use strict';

const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const http = require('./http');
const useS3api = false;

module.exports.load = (host, fn) => new Promise((resolve, reject) => {

    if (useS3api) {
        var params = {
            Bucket: host.replace(".s3.amazonaws.com", ""),
            Key: "config.json"
        };
        s3.getObject(params, (err, data) => {
            if (err) {
                console.error(err, err.stack);
                reject(err);
            }
            else {
                resolve(JSON.parse(data.Body.toString("utf-8")));
            }
        });
    } else {
        http.get(host, "config.json", fn)
        .then(data => {
            resolve(JSON.parse(data));
        })
        .catch(err => {
            console.error(err, err.stack);
            reject(err);
        });
    }
});