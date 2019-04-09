const { createHash }                 = require('crypto');
const { mkdir, readFile, writeFile } = require('fs');

// Generate md5 of a string
const md5 = (str) => {
  let md5sum = createHash('md5');
  md5sum.update(str);
  return md5sum.digest('hex');
}

module.exports = class FileDocumentStore {
  // Save data in a file, key as md5 - since we don't know what we could
  // be passed here
  set(key, data, callback) {
    try {
      mkdir('./data', '700', () => {
        writeFile('./data' + '/' + md5(key), data, 'utf8', (err) => {
          if (err) callback(false);
          else callback(true);  
        });
      });
    } catch (err) { callback(false); }
  }

  // Get data from a file from key
  get(key, callback) {
    readFile('./data' + '/' + md5(key), 'utf8', (err, data) => {
      if (err) callback(false);
      else callback(data);
    });
  }
}