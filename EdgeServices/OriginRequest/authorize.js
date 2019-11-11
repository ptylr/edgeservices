'use strict';

const applyRules = function (event, authorizeRules) {
    const request = event.Records[0].cf.request, headers = request.headers;
    console.log(`AUTHORIZE: Request for [${request.uri}]`);

    if (request.uri === "/config.json") {
        console.log(`AUTHORIZE: Config file [${request.uri}] not allowed.`);
        return {
            status: '404',
            statusDescription: 'Not Found',
            body: 'Not Found'
        };
    }

    // No rules means this request can be anonymous
    if (!authorizeRules) return;
    const keys = Object.keys(authorizeRules);
    if (!keys || !keys.length === 0) return;

    if (authorizeRules.paths && !authorizeRules.paths.some((e) => new RegExp(e).test(request.uri))) {
        console.log(`AUTHORIZE: Path [${request.uri}] does not require auth.`);
        return event;
    }

    if(typeof headers.authorization !== 'undefined')
    {
        console.log('AUTHORIZE: Authorization header received with request.');
        const creds = new Buffer.from(headers.authorization[0].value.substr(6), 'base64').toString('utf-8').split(':');
        if(creds.length === 2 && authorizeRules[creds[0]] === creds[1])
        {
            console.log(`AUTHORIZE: Successfully located authorized user for passed credentials: [${authorizeRules[creds[0]]}], fulfilling request.`);
            return event;
        }
    }
    console.log('AUTHORIZE: Request not authorized, sending HTTP 401.');
    return {
        status: '401',
        statusDescription: 'Unauthorized',
        body: 'Unauthorized',
        headers: {
            'www-authenticate': [{key: 'WWW-Authenticate', value:'Basic'}]
        },
    };
};

module.exports.applyRules = applyRules;