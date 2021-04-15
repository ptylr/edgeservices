'use strict';

const http = require("./http");
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const useS3api = false;

const applyRules = (event, fn, errorRules) => new Promise((resolve, reject) => {

    if (!errorRules) return resolve(event);
    if (!event || !event.Records || event.Records.length < 1 || !event.Records[0].cf || !event.Records[0].cf.request || !event.Records[0].cf.response) return resolve(event);
    // Don't do anything for success codes
    if (event.Records[0].cf.response.status.charAt(0) === '2') return resolve(event);

    const keys = Object.keys(errorRules);
    if (!keys || !keys.length === 0) return resolve(event);

    const request = event.Records[0].cf.request;
    const response = event.Records[0].cf.response;

    console.log(`ERRORS: Response for [${event.Records[0].cf.request.uri}], status [${response.status}]`);

    let errorUrl = errorRules[response.status];
    if (!errorUrl) 
    {
        //console.log(`ERRORS: No error page configured for status [${response.status}]`);
        return resolve(event);
    }

    if (typeof errorUrl !== "string") {
        if (errorUrl.status) response.status = errorUrl.status;
        if (errorUrl.statusDescription) response.statusDescription = errorUrl.statusDescription;
        if (errorUrl.headers) {
            const keys = Object.keys(errorUrl.headers);
            keys.forEach((key, _index) => {
                if (key !== "path") {
                    const value = errorUrl.headers[key];
                    if (typeof value === "undefined" || value === "" || value == null) {
                        console.log(`ERRORS: Removing header [${key}]`);
                        delete response.headers[key.toLowerCase()];
                    } else {
                        console.log(`ERRORS: Adding header [${key}] = [${value}]`);
                        response.headers[key.toLowerCase()] = [{key: key, value: value}];
                    }
                }
            });
        }
        errorUrl = errorUrl.url;
    }

    //response.headers["error"] = [{"key": "Error", "value": errorUrl}]
    if (errorUrl.indexOf("http") === 0) {
        http.get(errorUrl).then(res => {
            console.log(`ERRORS: Got error page [${errorUrl}], status [${response.status}]`);
            response.body = res.toString();
            return resolve(event);
        })
        .catch(_err => {
            console.warn(`ERRORS: Error loading error page [${errorUrl}]`);
            return resolve(event);
        });
    } else {
        // Use S3 to get the url
        if (errorUrl.charAt(0) === '/') errorUrl = errorUrl.substr(1);
        if (useS3api) {
            var params = {
                Bucket: request.headers.host[0].value.replace(".s3.amazonaws.com", ""),
                Key: errorUrl
            };
            s3.getObject(params, (err, data) => {
                if (err) {
                    console.warn(`ERRORS: Error loading error page [${errorUrl}], ${err}`);
                    return resolve(event);
                }
                else {
                    console.log(`ERRORS: Got error page [${errorUrl}], status [${response.status}]`);
                    response.body = data.Body.toString("utf-8");
                    return resolve(event);
                }
            });
        } else {
            const host = request.headers.host[0].value;
            if (errorUrl.charAt(errorUrl.length - 1) === "/") errorUrl += defaultDocument;
            console.log(`Requesting ${host}/${errorUrl}`);
            http.get(host, errorUrl, fn)
                .then(data => {
                    console.log(`ERRORS: Got error page [${errorUrl}], status [${response.status}]`);
                    response.body = data;
                    return resolve(event);
                })
                .catch(err => {
                    console.warn(`ERRORS: Error loading error page [${errorUrl}], ${err}`);
                    return resolve(event);
                });
    
        }
    }
});
module.exports.applyRules = applyRules;
