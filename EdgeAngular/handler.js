'use strict';

module.exports.handler = (event, context, callback) => {
    const defaultPath = 'index.html';
    const request = event.Records[0].cf.request;
    const isFile = uri => /\/[^/]+\.[^/]+$/.test(uri);
    if(!isFile(request.uri) && request.uri.indexOf(defaultPath) < 0)
    {
        const olduri = request.uri;
        request.uri = '/' + defaultPath;
        console.log('Request for [' + olduri + '], rewritten to [' + request.uri + ']');
    }
    callback(null, request);
};