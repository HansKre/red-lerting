const got = require('got');
const tunnel = require('tunnel');
const requests = require('../requests');
const jsonata = require("jsonata");

const MS_PER_MINUTE = 60000;
let timers = [];
let isRunning = false;

module.exports = function (RED) {

    /**
     * Constructor
     * @param {*} config 
     */
    function RedLertingCoreNode(config) {
        RED.nodes.createNode(this, config);

        /**
         * Register a listener on the input event to receive messages from the up-stream nodes in a flow
         */
        this.on('input', function (msg, send, done) {
            if (isRunning) {
                stopTimers(this);
                isRunning = false;
            } else {
                isRunning = true;

                onSuccess = (result) => {
                    send({
                        "payload": result
                    });
                    done();
                }

                onError = (err, msg) => {
                    // error properties: 'code', 'token', 'position', 'stack', 'message'
                    this.warn(err)
                    msg && this.warn(msg);
                    done(err);
                }

                requests.forEach(request => {
                    if (request.every) {
                        console.log(`Registering ${request.description} to execute every ${request.every} minutes`);
                        timers.push(
                            setInterval(() => handleRequest(request, onSuccess, onError),
                                request.every * MS_PER_MINUTE));
                    } else {
                        this.warn(`Missing the "every" property on ${request.description}. Executing only once.`);
                    }
                    // execute once immediately
                    handleRequest(request, onSuccess, onError);
                });
            }
        });

        /**
         * Close cleanup when an existing node gets deleted (when new flow is deleted)
         */
        this.on('close', function () {
            stopTimers(this);
        });
    }

    RED.nodes.registerType("red-lerting-core", RedLertingCoreNode);
}

const stopTimers = (node) => {
    node.warn("Stopping timers");
    timers.forEach(timer => clearInterval(timer));
}

const httpClient = (reqHeaders) => {
    const proxy = process.env.https_proxy || 'https://53.18.191.200:3128';
    const client = got.extend({
        headers: reqHeaders,
        agent: {
            https: tunnel.httpsOverHttp({
                proxy: {
                    host: proxy.split('://')[1].split(':')[0],
                    port: proxy.split(':')[2]
                }
            })
        },
        // https: {
        //     rejectUnauthorized: false
        // },
        timeout: 20000
    });
    return client;
}

const fireAlert = (reason, succb) => {
    succb({ "alert": true, "reason": reason });
}

const handleResponse = (request, response, succb, errcb) => {

    if (request.selects) {
        const jsonData = JSON.parse(response.body).responses[0];
        if (jsonData) {
            const res = {};
            Object.entries(request.selects).forEach(([property, expr]) => {
                const expression = jsonata(expr);
                const result = expression.evaluate(jsonData);
                res[property] = result;
            });
            checkAlert(response, request, succb, res);
            succb(res);
        } else {
            errcb("jsonData undefined");
        }
    } else {
        checkAlert(response, request, succb);
        succb(response.body)
    }

}

const httpReq = (request, succb, errcb, token) => {

    const headers = request.headers;
    if (token) {
        headers.cookie = token;
    }
    const client = httpClient(headers);

    if (request.body) {
        console.log('POSTing request to', request.url);
        client.post(request.url, { body: request.body })
            .then(response => handleResponse(request, response, succb, errcb))
            .catch(error => errcb(error, `happend at request: ${request.description}`));
    } else {
        console.log('GETing request from', request.url);
        client.get(request.url)
            .then(response => handleResponse(request, response, succb, errcb))
            .catch(error => errcb(error, `happend at request: ${request.description}`));
    }
}

const httpLogin = (request, succb, errcb) => {

    const client = httpClient(request.loginHeaders);
    const loginCreds = {
        "username": request.username,
        "password": request.password
    };

    console.log('POSTing login to', request.loginUrl);
    client.post(request.loginUrl, { body: JSON.stringify(loginCreds) })
        .then(response => {
            const setCookie = response.headers['set-cookie'][0];
            const loginToken = setCookie.split(';')[0];
            succb(loginToken);
        })
        .catch(error => errcb(error));
}

const handleRequest = (request, succb, errcb) => {

    if (request.loginRequest) {
        httpLogin(request.loginRequest, (token) => httpReq(request, succb, errcb, token), errcb);
    } else {
        httpReq(request, succb, errcb);
    }
}

function checkAlert(response, request, succb, res) {
    if (request.alert) {
        evaluateAndFire(response.body, request.alert.comp, request.alert.value, request.description, 'response.body', succb);
    }

    if (request.alertOr && request.alertOr !== "" && res) {
        Object.entries(request.alertOr).forEach(([property, { comp, value: compVal }]) => {
            if (res.hasOwnProperty(property))
                evaluateAndFire(res[property], comp, compVal, request.description, property, succb);
        });
    }

    if (request.alertAnd && request.alertAnd !== "" && res) {
        const alertReasons = [];
        Object.entries(request.alertAnd).every(([property, { comp, value: compVal }]) => {
            console.log("property:", property);
            if (res.hasOwnProperty(property)) {
                const { result, expressionStr } = evaluate(res[property], comp, compVal);
                console.log("result", result);
                if (result) {
                    alertReasons.push({ "property": property, "expressionStr": expressionStr });
                    console.log(alertReasons);
                    return true;
                } else {
                    // early exit on first not matching condition
                    alertReasons.length = 0;
                    return false;
                }
            } else {
                // abort alerting check if alerting-property is missing in selected properties in result
                alertReasons.length = 0;
                return false;
            }
        });
        if (alertReasons.length != 0) {
            const alertReasonsStr = alertReasons.map(({ property, expressionStr }) => {
                return property + ' ' + expressionStr;
            })
            fireAlert(`${request.description} alerts because: ${alertReasonsStr.join(' and ')}`, succb);
        }
    }
}

function evaluate(currentVal, comp, compVal) {
    let expressionStr;
    if ((typeof (currentVal) === 'string') && (typeof (compVal) === 'string')) {
        // needs to be: evaluate(`"UP" != "UP"`);
        expressionStr = `"${currentVal}" ${comp} "${compVal}"`;
    } else {
        expressionStr = `${currentVal} ${comp} ${compVal}`;
    }
    console.log(expressionStr);
    const expression = jsonata(expressionStr);
    const result = expression.evaluate();
    return { result, expressionStr };
}

function evaluateAndFire(currentVal, comp, compVal, description, property, succb) {
    const { result, expressionStr } = evaluate(currentVal, comp, compVal, description, property, succb);
    if (result)
        fireAlert(`${description} alerts because ${property} is ${expressionStr}`, succb);
}

