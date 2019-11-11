'use strict';

const http = require("http");
const https = require("https");

module.exports.get = (url) => new Promise((resolve, reject) => {

    const requester = url.indexOf("https") === 0 ? https : http;
    requester.get(url, response => {
        let body = "";
        if (response.statusCode !== 200) reject(null);
        response.setEncoding("utf8")
        response.on("data", chunk => {
            body += chunk;
        });
        response.on("end", () => {
            resolve(body);
        });
    }).on("error", error => {
        reject(error);
    });
});
