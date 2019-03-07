const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('db.json');
const db = low(adapter);

const uuidv4 = require('uuid/v4')
const fetch = require('node-fetch');

db.defaults({
  bots: {},
  games: {},
  matches: {},
}).write();

app.use(bodyParser.json());
app.use(cors());

function askForMove(bot, game) {
  
}

app.get('/bots', (req, res) => {
  const bots = db.get('bots').value();
  // TODO: hide private stuffs
  res.send(bots);
});

app.get('/matches', (req, res) => {
  const bots = db.get('bots').value();
  const games = db.get('games').value();
  const matchList = [];
  for (let match of Object.values(db.get('matches').value())) {
    console.log(match);
    let { bots: [botId0, botId1], game: gameId } = match;
    matchList.push({
      id: match.id,
      game: games[gameId].name,
      bots: [bots[botId0].name, bots[botId1].name],
      movesIn: match.history.length,
      turn: match.turn,
    });
  }
  res.send(matchList);
});

app.post('/startmatch', (req, res) => {
  const { bots: [botId0, botId1], game: gameId } = req.body;
  // TODO: validate inputs
  const bot0 = db.get('bots').get(botId0).value();
  const bot1 = db.get('bots').get(botId1).value();
  const game = db.get('games').get(gameId).value();

  let matchId;
  do {
    matchId = uuidv4();
  } while (!db.get('matches').has(matchId));

  let matchState = {
    id: matchId,
    game: game.id,
    bots: [bot0.id, bot1.id],
    history: [],
    turn: 0,
  };
  db.get('matches').set(matchId, matchState).write();

  res.send(matchState);
});

app.post('/movemade', (req, res) => {
  
});

app.listen(3000);

