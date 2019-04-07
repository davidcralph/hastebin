const { createHash }                 = require('crypto');
const { mkdir, readFile, writeFile } = require('fs');

// Generate md5 of a string
const md5 = (str) => {
  let md5sum = createHash('md5');
  md5sum.update(str);
  return md5sum.digest('hex');
}

// For storing in files
// options[type] = file
// options[path] - Where to store

module.exports = class FileDocumentStore {
  constructor(options) {
    this.basePath = './data';
    this.expire = options.expire;
  }

  // Save data in a file, key as md5 - since we don't know what we could
  // be passed here
  set(key, data, callback, skipExpire) {
    try {
      let _this = this;
      mkdir(this.basePath, '700', () => {
        let fn = _this.basePath + '/' + md5(key);
        writeFile(fn, data, 'utf8', (err) => {
          if (err) callback(false);
          else {
            callback(true);
            if (_this.expire && !skipExpire) console.log('File store cannot set expirations on keys');
          }
        });
      });
    } catch (err) {
      callback(false);
    }
  }

  // Get data from a file from key
  get(key, callback, skipExpire) {
    let _this = this;
    let fn = this.basePath + '/' + md5(key);
    readFile(fn, 'utf8', (err, data) => {
      if (err) callback(false);
      else {
        callback(data);
        if (_this.expire && !skipExpire) console.log('File store cannot set expirations on keys');
      }
    });
  }
}