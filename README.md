# Description

Show case usage of a custom Node-RED node which can be integrated into the flows. It receives it's config through ```requests.js```.

## Configuration Options

### Endpoint returns single value

Following example will execute request every 30 seconds and alert if the response is larger than the given value.

```json
"every": 0.5,
"alert": {
    "comp": ">",
    "value": 3173763
}
```

### Endpoint returns JSON-format

If the endpoint's response is in ```JSON-format```, you might want to ```select``` certain properties to be forwarded to Node-RED only.
For that, use [jasonata](https://jsonata.org/)-synthax.

If you defined ```selects```, you can setup alerting for those.

There is the possibility to listen for multiple conditions to be met at the same time. Use ```alertAnd``` to configure that kind of behavior.

If you want to listen for any condition to be met, use ```alertOr```.

Both can be combined.

```json
"selects": {
    "name": "hits.hits.'_source'.poller.name",
    "host": "hits.hits.'_source'.poller.host",
    "timestamp": "hits.hits.'_source'.'@timestamp'",
    "runtime_seconds": "hits.hits.'_source'.poller.runtime_seconds",
    "diskspace": "hits.hits.'_source'.application.details.diskSpace.details.free",
    "state": "hits.hits.'_source'.application.status"
},
"alertOr": {
    "diskspace": {
        "comp": "<=",
        "value": 60512812032
    },
    "state": {
        "comp": "=",
        "value": "UP"
    },
},
"alertAnd": {
    "diskspace": {
        "comp": "<=",
        "value": 70512812032
    },
    "state": {
        "comp": "=",
        "value": "UP"
    },
    "runtime_seconds": {
        "comp": ">",
        "value": 0.01
    }
},
```

### Endpoint-Authentication

An example how to provide a pre-flighted login-request to obtain an access token.

```json
"loginRequest": {
    "loginUrl": "http://your-domain.com/v1/login",
    "username": "user",
    "password": "password",
    "loginHeaders": {
```

## Local testing

During development and local testing, red-lerting module is installed by referencing it's local path. This leads to NPM build and copy files into the node-red plugins-folder.

```bash
git clone <repo-url>
npm install
# cd into node-red folder
npm install <absolute-path-to-red-lerting-repo>/red-lerting && npm run start
```

**Example:**

```bash
npm install /mnt/c/Users/<user>/user>/git/node-red/red-lerting && npm run start
```

## ```requests.js```

File contains credentials.
Extract with key ```Red-Lerting requests.js // for dev``` from password vault.

### Why not ```dotenv```?

[dotenv's](https://www.npmjs.com/package/dotenv) use case is to expose environmental configuration (such as credentials) through ```env-variables```. Here, we have a slightly different use case where ```JSON-object``` are much more suitable.

### encrypt

```bash
export REQUESTS_PW="foo"
openssl enc -aes-256-cbc -in requests.js -out requests.js.enc -k $REQUESTS_PW
```

### decrypt

```bash
openssl enc -aes-256-cbc -d -in requests.js.enc -out requests.js -k $REQUESTS_PW
```
