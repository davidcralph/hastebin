const app              = require('connect')();
const route            = require('connect-route');
const connect_st       = require('st');
const { readFileSync } = require('fs');

const DocumentHandler = require('./lib/document_handler.js');

// Load the configuration and set some defaults
const config = require('./config.json');
config.port = process.env.PORT || config.port || 7777;
config.host = process.env.HOST || config.host || 'localhost';

// build the store from the config on-demand - so that we don't load it
// for statics
let Store = require('./lib/document_store.js');
let preferredStore = new Store(config.storage);

// Send the static documents into the preferred store, skipping expirations
for (let name in config.documents) {
  let data = readFileSync(config.documents[name], 'utf8');
  console.log('Loading static document');
  if (data) preferredStore.set(name, data, () => console.log(`Loaded static document ${name}`), true);
  else console.log(`Failed to load static document ${name}`);
}

// Configure the document handler
let documentHandler = new DocumentHandler({ store: preferredStore });

// first look at API calls
app.use(route((router) => {
  // get raw documents - support getting with extension
  router.get('/raw/:id', (request, response) => {
    let key = request.params.id.split('.')[0];
    return documentHandler.handleRawGet(key, response, !!config.documents[key]);
  });
  // add documents
  router.post('/documents', (request, response) => {
    return documentHandler.handlePost(request, response);
  });
  // get documents
  router.get('/documents/:id', (request, response) => {
    let key = request.params.id.split('.')[0];
    return documentHandler.handleGet(key, response, !!config.documents[key]);
  });
}));

// Otherwise, try to match static files
app.use(connect_st({
  path: __dirname + '/static',
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
  index: 'index.html'
}));

app.listen(config.port, console.log(`Listening on ${config.host}:${config.port}`));
