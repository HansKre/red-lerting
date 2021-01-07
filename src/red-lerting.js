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
    function RedLertingNode(config) {
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

                onError = (err) => {
                    this.warn(err);
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

    RED.nodes.registerType("red-lerting", RedLertingNode);
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
        timeout: 5000
    });
    return client;
}

const handleAlerts = () => {
    /**
     *  TODO:
     *      * implement comperators: lt, gt, eq, ne
     *      * handle case where alert-property is not a select-property
     *      * implement alertOr
     *      * implement alertAnd
     *      * take decision: allow alerts even if select is undefined? (example: mvis-count)
     *      * https://docs.jsonata.org/comparison-operators
     * */
}

const handleResponse = (request, response, succb, errcb) => {

    if (request.select) {
        const jsonData = JSON.parse(response.body).responses[0];
        if (jsonData) {
            const res = {};
            Object.entries(request.select).forEach(([property, expr]) => {
                const expression = jsonata(expr);
                const result = expression.evaluate(jsonData);
                res[property] = result;
            });

            succb(res);
        } else {
            errcb("jsonData undefined");
        }
    } else {
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
            .catch(error => errcb(error));
    } else {
        console.log('GETing request from', request.url);
        client.get(request.url)
            .then(response => handleResponse(request, response, succb, errcb))
            .catch(error => errcb(error));
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