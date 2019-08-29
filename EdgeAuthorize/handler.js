'use strict';

const passwordFileName = "/passwords.json", http = require("http"),
    passwordFile = url => new Promise((resolve, reject) => {
        http.get(url, response => {
            let body = [];
            if (response.statusCode !== 200) resolve(null);
            response.setEncoding("utf8");
            response.on("data", chunk => {
                body.push(chunk);
            });
            response.on("end", () => {
                resolve(body.join(""));
            });
        }).on("error", error => {
            reject(error);
        });
    });

module.exports.handler = (event, context, callback) => {
    const request = event.Records[0].cf.request, headers = request.headers;
    console.log('Request for [' + request.uri + ']');
    if(request.uri === passwordFileName)
    {
        // Prevent passwordFileName from being served
        console.log('Attempt to serve ' + passwordFileName + ' - returning 404.');
        callback(null, {
            status: '404',
            statusDescription: 'Not Found',
            body: 'Not Found',
        });
        return;
    }

    // Check to see whether we have a /passwords.json file in Origin
    passwordFile("http://" + headers.host[0].value + passwordFileName)
        .then(result => {
            if(result)
            {
                // The /passwords.json file has been found, we need to ensure authorization
                console.log("/passwords.json file located in origin for request.");
                if(typeof headers.authorization !== 'undefined')
                {
                    console.log('Authorization header sent on request.');
                    const passwords = JSON.parse(result).authorized;
                    const creds = new Buffer.from(headers.authorization[0].value.substr(6), 'base64').toString('utf-8').split(':');
                    if(creds.length === 2 && passwords[creds[0]] === creds[1])
                    {
                        console.log('Successfully located authorized user for passed credentials: [' + passwords[creds[0]] + '], fulfilling request.');
                        callback(null, request);
                        return;
                    }
                }
                console.log('Request not authorized, sending HTTP 401.');
                callback(null, {
                    status: '401',
                    statusDescription: 'Unauthorized',
                    body: 'Unauthorized',
                    headers: {
                        'www-authenticate': [{key: 'WWW-Authenticate', value:'Basic'}]
                    },
                });
                return;
            }
            // No /passwords.json file found, therefore fulfil original request.
            console.log('Anonymous content ok for this request.');
            callback(null, request);
            return;
        })
        .catch(error => {
            console.error(error);
            return;
        });
};