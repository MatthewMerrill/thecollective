const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

const fetch = require('node-fetch');

app.use(bodyParser.json());
app.use(cors());

app.post('/getmove', (req, res) => {
  const {callback, history} = req.body();
  res.send(200);

  for (let possibleMove = 0; possibleMove < 9; possibleMove++) {
    if (history.indexOf(possibleMove) < 0) {
      fetch(callback, possibleMove);
      break;
    }
  }
});

app.listen(4001);

