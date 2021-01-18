module.exports = [
    {
        "description": "some description",
        "url": "https://my-domain.com/foo/count/",
        "headers": {
            "Connection": "keep-alive",
            "Accept": "application/json, text/plain, */*",
            "Authorization": "Basic xyz",
            "Sec-Fetch-Site": "cross-site",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty",
            "Accept-Language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
        },
        "every": 0.5,
        "alert": {
            "comp": ">",
            "value": 3173763
        }
    },
    {
        "description": "foo",
        "url": "some url",
        "headers": {
            "accept": "application/json, text/plain, */*",
            "accept-language": "en-US,en;q=0.9,de-DE;q=0.8,de;q=0.7",
            "content-type": "application/x-ndjson",
            "referrer": "",
            "referrerPolicy": "strict-origin-when-cross-origin",
        },
        "body": "stringified JSON payload",
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
        "every": 1,
        "loginRequest": {
            "loginUrl": "http://my-domain/kibana/api/security/v1/login",
            "username": "admin",
            "password": "admin",
            "loginHeaders": {
                "accept": "application/json, text/plain, */*",
                "accept-language": "en-US,en;q=0.9,de-DE;q=0.8,de;q=0.7",
                "content-type": "application/json;charset=UTF-8",
                "referrerPolicy": "strict-origin-when-cross-origin",
            }
        }
    }
]