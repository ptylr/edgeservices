'use strict';

var noCaseSyntax = /NC/;
var lastSyntax = /L/;
var redirectSyntax = /R=?(\d+)?/;
var forbiddenSyntax = /F/;
var goneSyntax = /G/;
var hostSyntax =  /H=([^,]+)/;
var flagSyntax = /\[([^\]]+)]$/;
var partsSyntax = /\s+|\t+/g;
var querySyntax = /\?(.*)/;
let req = {};
let host = "";
const s3checker = require("./s3checker");

const applyRules = async function(event, rewriteRules, fn, defaultDocument) {

    defaultDocument = defaultDocument || "index.html";

    req = event.Records[0].cf.request;
    host = req.headers.host[0].value;
    let uri = req.uri;

    let acc = { 'res': Object.assign({},req)};
    for (let i = 0, len = rewriteRules.length; i < len; i++) {
        let rule = rewriteRules[i];
        if (acc.skip == true) {
            continue;
        }

        if (rule.host) {
            continue;
        }

        if (rule.conditions && rule.conditions.length && !await reducer(rule, acc, fn, defaultDocument)) {
            continue;
        }

        if (rule.hostRW) {
            acc.res.headers.host[0].value = rule.hostRW;
        }

        var match = rule.regexp.test(uri);
        // If not match
        if (!match) {
            // Inverted rewrite
            if (rule.inverted) {
                if (!rule.redirect) {
                    acc.res.uri = rule.replace;
                    uri = acc.res.uri;
                    console.log(`REWRITE: Request for [${uri}] rewritten to [${acc.res.uri}]`);
                    acc.skip = rule.last;
                    continue;
                }
            } else {
                continue;
            }
        }

        // Gone
        if (rule.gone) {
            console.log(`REWRITE: Request for [${uri}] is 410 Gone`);
            acc = {'res': {status: '410',statusDescription: 'Gone'},'skip': rule.last};
            continue;
        }

        // Forbidden
        if (rule.forbidden) {
            console.log(`REWRITE: Request for [${uri}], is 403 Forbidden`);
            acc = { 'res': { status: '403', statusDescription: 'Forbidden' }, 'skip': rule.last};
            continue;
        }

        // Redirect
        if (rule.redirect) {
            console.log(`REWRITE: Request for [${uri}] is ${(rule.redirect || 301)} redirect to [${(rule.inverted ? rule.replace : uri.replace(rule.regexp, rule.replace))}]`);
            acc = {
                'res': {
                    status: rule.redirect || 301,
                    statusDescription: 'Found',
                    headers: {
                        location: [{
                            key: 'Location',
                            value: rule.inverted ? rule.replace : uri.replace(rule.regexp, rule.replace),
                        }],
                    },
                }, 'skip': rule.last
            };
            continue;
        }

        // Rewrite
        if (!rule.inverted) {
            if (rule.replace !== '-') {
                acc.res.uri = uri.replace(rule.regexp, rule.replace);
                console.log(`REWRITE: Request for [${uri}] rewritten to [${acc.res.uri}]`);
                uri = acc.res.uri;
            }
            acc.skip = rule.last;
            continue;
        }
    }
    return acc;
}
module.exports.applyRules = applyRules;

/**
 * Get flags from rule rules
 *
 * @param {Array.<rules>} rules
 * @return {Object}
 * @api private
 */
const parseRules = function(unparsedRules) {
    return (unparsedRules || []).map(function (rule) {
        // Reset all regular expression indexes
        lastSyntax.lastIndex = 0;
        redirectSyntax.lastIndex = 0;
        forbiddenSyntax.lastIndex = 0;
        goneSyntax.lastIndex = 0;
        hostSyntax.lastIndex = 0;

        let conditions = [];
        if (typeof rule !== "string") {
            conditions = rule.splice(0, rule.length - 1);
            rule = rule[0];
        }

        var parts = rule.replace(partsSyntax, ' ').split(' '), flags = '';

        if (flagSyntax.test(rule)) {
            flags = flagSyntax.exec(rule)[1];
        }

        // Check inverted urls
        var inverted = parts[0].substr(0, 1) === '!';
        if (inverted) {
            parts[0] = parts[0].substr(1);
        }

        var redirectValue = redirectSyntax.exec(flags);
        var hostValue = hostSyntax.exec(flags);

        return {
            conditions: conditions.map(mapConditions).filter(c => c.test),
            regexp: typeof parts[2] !== 'undefined' && noCaseSyntax.test(flags) ? new RegExp(parts[0], 'i') : new RegExp(parts[0]),
            replace: parts[1],
            inverted: inverted,
            last: lastSyntax.test(flags),
            redirect: redirectValue ? (typeof redirectValue[1] !== 'undefined' ? redirectValue[1] : 301) : false,
            forbidden: forbiddenSyntax.test(flags),
            gone: goneSyntax.test(flags),
            host: hostValue ? new RegExp(hostValue[1]) : false
        };
    });
};
module.exports.parseRules = parseRules;

const mapConditions = (condition) => {
    // TODO: parts should be able to contain spaces surrounded by quotes
    var parts = condition.replace(partsSyntax, ' ').split(' '), flags = '';
    if (flagSyntax.test(condition)) {
        flags = flagSyntax.exec(condition)[1];
    }
    // Protect against misconfiguration
    if (parts.length < 2) {
        parts = ["",""];
        console.warn(`REWRITES: Unable to parse condition [${condition}]`);
    }

    let result = {
        test: tidyConditionPart(parts[0])
    };
    let value = tidyConditionPart(parts[1]);
    const nc = noCaseSyntax.test(flags);
    if (nc) result.noCase = true;
    if (value.length > 0 && value.charAt(0) === '!') {
        result.inverted = true;
        value = value.substr(1);
    }
    if (value.length >= 2 && value.substr(0, 1) === "-") {
        if (value.substr(0, 2) === "-f") {
            result.isFile = true;
        } else if (value.substr(0, 2) === "-d") {
            result.isDirectory = true;
        }
    } else {
        result.regexp = nc ? new RegExp(value, 'i') : new RegExp(value);
    }
    return result;
};

function tidyConditionPart(part) {
    // Strip surrounding quotes
    if ((part.charAt(0) === '"' && part.charAt(part.length - 1) === '"')
    || (part.charAt(0) === "'" && part.charAt(part.length - 1) === "'")) {
        return part.substr(1,part.length - 2);
    }
    return part;
}

const evaluateCondition = async (condition, acc, fn, defaultDocument) => {
    condition.test = expandMacros(condition.test || "", acc);
    console.log(`REWRITE: Evaluating ${JSON.stringify(condition)}`);
    if (!condition.test) return false;

    if (condition.regexp) {
        let match = condition.regexp.test(condition.test);
        if (condition.inverted) match = !match;
        //console.log(`REWRITE: Match is ${match}`);
        return match;
    } else if (condition.isFile) {
        //console.log(`REWRITE: Testing if [${condition.test}] is ${condition.inverted ? "NOT " : ""}a file`);
        var result = await s3checker.isFile(host, condition.test, fn, defaultDocument);
        if (condition.inverted) result = !result;
        return result;
    } else if (condition.isDirectory) {
        //console.log(`REWRITE: Testing if [${condition.test}] is ${condition.inverted ? "NOT " : ""}a directory`);
        var result = await s3checker.isDirectory(host, condition.test, fn, defaultDocument);
        if (condition.inverted) result = !result;
        return result;
    } else {
        console.warn(`REWRITE: unhandled condition ${JSON.stringify(condition)}`);
        return false;
    }
};

function expandMacros(value, acc) {
    return (value || "")
    .replace("%{HTTP_HOST}", req.headers.host[0].value)
    .replace("%{REQUEST_PATH}", acc.res.uri || req.uri)
    ;
}

async function reducer(rule, acc, fn, defaultDocument) {
    for (let i = 0, len = rule.conditions.length; i < len; i++) {
        let condition = Object.assign({},rule.conditions[i]);
        const result = await evaluateCondition(condition, acc, fn, defaultDocument);
        console.log(`REWRITE: Evaluated  ${JSON.stringify(condition)} - result = ${result}`);
        if (!result) {
            return false;
        }
    }
    return true;
}
