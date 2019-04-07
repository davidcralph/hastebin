const route            = require('connect-route');
const connect          = require('connect');
const connect_st       = require('st');
const { readFileSync } = require('fs');

const DocumentHandler = require('./lib/document_handler.js');

// Load the configuration and set some defaults
const config = require('./config.json');
config.port = process.env.PORT || config.port || 7777;
config.host = process.env.HOST || config.host || 'localhost';

// build the store from the config on-demand - so that we don't load it
// for statics
if (!config.storage) config.storage = { type: 'file' };
if (!config.storage.type) config.storage.type = 'file';

let Store, preferredStore;
Store = require('./lib/document_stores/' + config.storage.type);
preferredStore = new Store(config.storage);


// Send the static documents into the preferred store, skipping expirations
let path, data;
for (let name in config.documents) {
  path = config.documents[name];
  data = readFileSync(path, 'utf8');
  console.log('Loading static document');
  if (data) preferredStore.set(name, data, () => { console.log(`Loaded static document ${name}`); }, true);
  else console.log(`Failed to load static document ${name}`);
}

// Pick up a key generator
let pwOptions = config.keyGenerator || {};
pwOptions.type = pwOptions.type || 'random';
let gen = require('./lib/key_generators/' + pwOptions.type);
let keyGenerator = new gen(pwOptions);

// Configure the document handler
let documentHandler = new DocumentHandler({
  store: preferredStore,
  maxLength: config.maxLength,
  keyLength: config.keyLength,
  keyGenerator: keyGenerator
});

let app = connect();

// first look at API calls
app.use(route((router) => {
  // get raw documents - support getting with extension
  router.get('/raw/:id', (request, response) => {
    let key = request.params.id.split('.')[0];
    let skipExpire = !!config.documents[key];
    return documentHandler.handleRawGet(key, response, skipExpire);
  });
  // add documents
  router.post('/documents', (request, response) => {
    return documentHandler.handlePost(request, response);
  });
  // get documents
  router.get('/documents/:id', (request, response) => {
    let key = request.params.id.split('.')[0];
    let skipExpire = !!config.documents[key];
    return documentHandler.handleGet(key, response, skipExpire);
  });
}));

// Otherwise, try to match static files
app.use(connect_st({
  path: __dirname + '/static',
  content: { maxAge: config.staticMaxAge },
  passthrough: true,
  index: false
}));

// Then we can loop back - and everything else should be a token,
// so route it back to /
app.use(route((router) => {
  router.get('/:id', (request, response, next) => {
    request.sturl = '/';
    next();
  });
}));

// And match index
app.use(connect_st({
  path: __dirname + '/static',
  content: { maxAge: config.staticMaxAge },
  index: 'index.html'
}));

app.listen(config.port);

console.log(`Listening on ${config.host}:${config.port}`);