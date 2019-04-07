const Busboy          = require('busboy');
const { randomBytes } = require('crypto');

// For handling serving stored documents
module.exports = class DocumentHandler {
  constructor(options) {
    if (!options) options = {};
    this.maxLength = options.maxLength; // none by default
    this.store = options.store;
  }

  // Handle retrieving a document
  handleGet(key, response, skipExpire) {
    this.store.get(key, (ret) => {
      if (ret) {
        console.log('Retrieved document', { key: key });
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ data: ret, key: key }));
      } else {
        console.log(`Document not found ${key}`);
        response.writeHead(404, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ message: 'Document not found.' }));
      }
    }, skipExpire);
  }

  // Handle retrieving the raw version of a document
  handleRawGet(key, response, skipExpire) {
    this.store.get(key, (ret) => {
      if (ret) {
        console.log(`Retrieved raw document ${key}`);
        response.writeHead(200, { 'content-type': 'text/plain; charset=UTF-8' });
        response.end(ret);
      } else {
        console.log(`Raw document not found ${key}`);
        response.writeHead(404, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ message: 'Document not found.' }));
      }
    }, skipExpire);
  }

  // Handle adding a new Document
  handlePost(request, response) {
    let _this = this;
    let buffer = '';
    let cancelled = false;

    // What to do when done
    let onSuccess = () => {
      // Check length
      if (_this.maxLength && buffer.length > _this.maxLength) {
        cancelled = true;
        console.log(`document >maxLength ${_this.maxlength}`);
        response.writeHead(400, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ message: 'Document exceeds maximum length.' }));
        return;
      }
      // And then save if we should
      _this.chooseKey((key) => {
        _this.store.set(key, buffer, (res) => {
          if (res) {
            console.log(`Added document ${key}`);
            response.writeHead(200, { 'content-type': 'application/json' });
            response.end(JSON.stringify({ key: key }));
          } else {
            console.log('Error adding document');
            response.writeHead(500, { 'content-type': 'application/json' });
            response.end(JSON.stringify({ message: 'Error adding document.' }));
          }
        });
      });
    }
    // If we should, parse a form to grab the data
    let ct = request.headers['content-type'];
    if (ct && ct.split(';')[0] === 'multipart/form-data') {
      let busboy = new Busboy({ headers: request.headers });
      busboy.on('field', (fieldname, val) => { if (fieldname === 'data') buffer = val; });
      busboy.on('finish', () => { onSuccess(); });
      request.pipe(busboy);
      // Otherwise, use our own and just grab flat data from POST body
    } else {
      request.on('data', (data) => { buffer += data.toString(); });
      request.on('end', () => {
        if (cancelled) return;
        onSuccess();
      });
      request.on('error', (error) => {
        console.log(`Connection error: ${error.message}`);
        response.writeHead(500, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ message: 'Connection error.' }));
        cancelled = true;
      });
    }
  }

  // Keep choosing keys until one isn't taken
  chooseKey(callback) {
    let key = this.acceptableKey();
    let _this = this;
    this.store.get(key, function (ret) {
      if (ret) _this.chooseKey(callback);
      else callback(key);
    }, true); // Don't bump expirations when key searching
  }

  acceptableKey() {
    return randomBytes(8).toString('hex');
  }
}