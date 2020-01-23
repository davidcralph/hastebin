//* Imports
const app = require('express')();
const st = require('st');
const fs = require('fs');
const DocumentHandler = require('./lib/document_handler.js');
const config = require('./config.json');

// build the store from the config on-demand - so that we don't load it
// for statics
let Store = require('./lib/document_store.js');
let preferredStore = new Store(config.storage);

// Send the static documents into the preferred store, skipping expirations
for (let name in config.documents) {
  let data = fs.readFileSync(config.documents[name], 'utf8');
  console.log('Loading static document');
  if (data) preferredStore.set(name, data, () => console.log(`Loaded static document ${name}`), true);
  else console.log(`Failed to load static document ${name}`);
}

// Configure the document handler
let documentHandler = new DocumentHandler({ store: preferredStore });

// first look at API calls
// get raw documents - support getting with extension
app.get('/raw/:id', (req, res) => documentHandler.handleRawGet(req.params.id.split('.')[0], res, !!config.documents[req.params.id.split('.')[0]]));
// add documents
app.post('/documents', (req, res) => documentHandler.handlePost(req, res));
// get documents
app.get('/documents/:id', (req, res) => documentHandler.handleGet(req.params.id.split('.')[0], res, !!config.documents[req.params.id.split('.')[0]]));

// Otherwise, try to match static files
app.use(st({ path: './static', passthrough: true, index: false }));

// Then we can loop back - and everything else should be a token,
// so route it back to /
app.get('/:id', (req, _res, next) => {
  req.sturl = '/';
  next();
});

// And match index
app.use(st({ path: './static', index: 'index.html' }));

// Listen on port
app.listen(config.port, console.log(`Listening on ${config.host}:${config.port}`));