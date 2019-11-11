'use strict';

const applyRules = function(event, defaultDocumentRule) {

    console.log(`DEFAULT DOCUMENT: Request for [${event.Records[0].cf.request.uri}]`);

    if (!defaultDocumentRule) return event;
    if (!event || !event.Records || event.Records.length < 1 || !event.Records[0].cf || !event.Records[0].cf.request) return event;

    const request = event.Records[0].cf.request;

    const olduri = request.uri;
    if (olduri.substring(olduri.length - 1) === "/") {
        request.uri += defaultDocumentRule;
        console.log(`DEFAULT DOCUMENT: Request for [${olduri}], rewritten to [${request.uri}]`);
    }

    return event;
}
module.exports.applyRules = applyRules;
