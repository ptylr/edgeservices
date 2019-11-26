'use strict';

const http = require("http");

module.exports.get = (host, path, fn) => new Promise((resolve, reject) => {

    const options = {method: 'GET', host: host, path: "/" + path, headers: {'Referer':fn}};
    http.get(options, response => {
        let body = [];
        if (response.statusCode !== 200) reject(response.statusCode);
        response.setEncoding("utf8")
        response.on("data", chunk => {
            body.push(chunk);
        });
        response.on("end", () => {
            resolve(body.join(""));
        });
    }).on("error", error => {
        console.error(`HTTP: error loading [${url}]: ${error}`);
        reject(500);
    });
});

module.exports.check = (host, path, fn) => new Promise((resolve, reject) => {
    const options = {method: 'HEAD', host: host, path: "/" + path, headers: {'Referer':fn}};
    http.get(options, response => {
        if (response.statusCode !== 200) reject(response.statusCode);
        resolve(200);
    }).on("error", error => {
        console.error(`HTTP: error loading [${host}/${path}]: ${error}`);
        reject(500);
    });
});
