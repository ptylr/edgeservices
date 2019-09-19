'use strict';

module.exports.handler = (event, context, callback) => {
    const request = event.Records[0].cf.request;
    const olduri = request.uri;
    request.uri = olduri.replace(/\/$/, '\/index.html');
    console.log('Request for [' + olduri + '], rewritten to [' + request.uri + ']');
    callback(null, request);
};