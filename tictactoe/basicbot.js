const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

const fetch = require('node-fetch');

app.use(bodyParser.json());
app.use(cors());

app.post('/getmove', (req, res) => {
  const {callback, history} = req.body;
  console.log(req.body);
  res.sendStatus(200);

  for (let possibleMove = 0; possibleMove < 9; possibleMove++) {
    if (history.indexOf(possibleMove) < 0) {
      console.log('making move:', possibleMove, callback);
      fetch(callback, {
        method: 'post',
        headers: {
          'Content-type': 'application/json',
        },
        body: JSON.stringify({ move: possibleMove }),
      });
      break;
    }
  }
});

app.listen(4001);

