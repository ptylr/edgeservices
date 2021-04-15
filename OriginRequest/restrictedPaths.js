'use strict';

const applyRules = function (event, pathRules) {

    // No rules means this request is allowed
    if (!pathRules) return event;
    const keys = Object.keys(pathRules);
    if (!keys || !keys.length === 0) return event;

    const request = event.Records[0].cf.request;
    console.log(`RESTRICTED PATHS: Request for [${request.uri}]`);

    if (pathRules && pathRules.length > 0 && pathRules.some((e) => new RegExp(e).test(request.uri))) {
        console.log(`RESTRICTED PATHS: Path [${request.uri}] is forbidden.`);
        return {
            status: '403',
            statusDescription: 'Forbidden'
        };
    }

    console.log(`RESTRICTED PATHS: Path [${request.uri}] is permitted.`);
    return event;
};

module.exports.applyRules = applyRules;