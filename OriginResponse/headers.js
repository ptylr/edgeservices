'use strict';

const applyRules = function(event, headerRules) {

    if (!headerRules) return event;
    if (!event || !event.Records || event.Records.length < 1 || !event.Records[0].cf || !event.Records[0].cf.response) return event;
    // Don't do anything for non-success codes
    if (event.Records[0].cf.response.status.charAt(0) !== '2') return event;

    const request = event.Records[0].cf.request;
    console.log(`HEADERS: Response for [${request.uri}]`);

    const response = event.Records[0].cf.response;
    if (!response.headers) response.headers = {};

    for (let i = 0, len = headerRules.length; i < len; i++) {
        let rule = headerRules[i];
        if (!rule.path || new RegExp(rule.path).test(request.uri)) {
            const keys = Object.keys(rule);
            const overwrite = rule["overwrite"] === true;
            if (!keys || !keys.length === 0) continue;
            console.log(`HEADERS: Processing headers for path [${rule.path || ''}]`);
            keys.forEach((key, _index) => {
                if (key !== "path") {
                    const value = rule[key];
                    if (typeof value === "undefined" || value === "" || value == null) {
                        console.log(`HEADERS: Removing header [${key}]`);
                        delete response.headers[key.toLowerCase()];
                    } else {
                        if (overwrite || !response.headers.hasOwnProperty(key.toLowerCase())) {
                            console.log(`HEADERS: Adding header [${key}] = [${value}]`);
                            response.headers[key.toLowerCase()] = [{key: key, value: value}];
                        }
                    }
                }
            });
        }
    }

    return event;
}
module.exports.applyRules = applyRules;
