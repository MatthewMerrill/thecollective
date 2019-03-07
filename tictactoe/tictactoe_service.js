const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

app.use(bodyParser.json());
app.use(cors());

app.post('/validmoves', (req, res) => {
  const history = req.body();
  res.send(history[0]);
});

app.listen(5001);

