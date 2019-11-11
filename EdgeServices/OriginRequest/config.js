'use strict';

const AWS = require('aws-sdk');
const s3 = new AWS.S3();

module.exports.load = host => new Promise((resolve, reject) => {

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

});