# Description
Foo bar

# Development
## Local testing
```
git clone <repo-url>
npm install
# cd into sales-funnel repo
npm install <absolute-path-to-red-lerting-repo>/red-lerting && npm run start
```

Example:
```
npm install /mnt/c/Users/krebsha/git/node-red/red-lerting && npm run start
```

## ```requests.js```
The file contains credentials.
Extract with key ```Red-Lerting requests.js // for dev``` from https://vault.mercedes-benz.io/

### encrypt
```
export REQUESTS_PW="foo"
openssl enc -aes-256-cbc -in requests.js -out requests.js.enc -k $REQUESTS_PW
```

### decrypt
```
openssl enc -aes-256-cbc -d -in requests.js.enc -out requests.js -k $REQUESTS_PW
```

# Deployment
...