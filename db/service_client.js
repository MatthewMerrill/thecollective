const SqliteDataStore = require('../db/datastore_sqlite.js');

module.exports = class RemoteDataStoreClient {
  constructor() {
    const DB_URL = process.env.DB_URL;
    console.log('DB located at', DB_URL);
    const props = Object.getOwnPropertyNames(SqliteDataStore.prototype);
    const fetch = require('node-fetch');
    for (let key of props) {
      if (key !== 'constructor' && key !== 'initialize') {
        this[key] = async function() {
          try {
            let args = [...arguments];
            console.log(key, JSON.stringify(args));
            let res = await fetch(`${DB_URL}/${key}`, {
              method: 'post',
              headers: {
                'Content-type': 'application/json',
                'Accept': 'application/json',
              },
              body: JSON.stringify(args),
            });
            if (res.status === 204) {
              return undefined;
            }
            else {
              return res.json();
            }
          } catch (err) {
            console.error(err);
            throw err;
          }
        };
      }
    }
  }
}
