const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('cookie-session');

require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const SqliteDataStore = require('./datastore_sqlite');
db = new SqliteDataStore();
db.initialize(process.env.DB_FILE || './db.sqlite').then(() => {
  // I love not having typechecking
  const proto = Object.getPrototypeOf(db);
  const props = Object.getOwnPropertyNames(proto);
  console.log(props);
  for (let key of props) {
    let fn = db[key];
    if (key !== 'constructor' && typeof key === 'string' && typeof fn === 'function') {
      app.post(`/${key}`, async (req, res) => {
        try {
          let args = req.body;
          console.log('Processing', key, args);
          let ret = await db[key].apply(db, args);
          if (ret === undefined) {
            res.sendStatus(204);
          }
          else {
            res.send(JSON.stringify(ret));
          }
        } catch (err) {
          console.error(err);
          res.sendStatus(500);
        }
      });
      console.log('Routed method', key);
    }
    else {
      console.log('Cannot route for method/property', key);
    }
  }
  const port = process.env.DB_PORT || 3030;
  console.log(`DB Service hosted on :${port}`);
  app.listen(port);
}).catch(console.error);

