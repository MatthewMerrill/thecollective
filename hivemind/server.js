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

const callbackBase = 'http://localhost:3000';

db.defaults({
  bots: {},
  games: {},
  matches: {},
  nonces: {},
}).write();

app.use(bodyParser.json());
app.use(cors());

function getNonce(purpose, payload) {
  let nonce;
  do {
    nonce = uuidv4();
  } while (db.get('nonces').has(nonce).value());
  if (db.get('nonces').set(nonce, {nonce, purpose, payload}).write()) {
    return nonce;
  }
}

function checkAndWipeNonce(nonce, purpose) {
  let record = db.get('nonces').get(nonce).value();
  console.log('found record', record);
  if (record && record.purpose === purpose) {
    if (db.get('nonces').unset(nonce).write()) {
      return record.payload;
    }
  }
  throw new Error('BAD NONCE');
}

function askForMove(bot, gameId, match) {
  let theHook = `${bot.hook}/getmove`;
  // TODO: this should be brokered by an external server that can only
  // send requests OUT of the network (and receive in from internal for
  // the messages that need to be forwarded) so that we can't have people
  // utilizing this to send local requests
  let nonce = getNonce('makemove', {
    bot: bot.id,
    game: gameId,
    match: match.id
  });
  return fetch(theHook, {
    method: 'post',
    headers: {
      'Content-type': 'application/json',
    },
    body: JSON.stringify({
      callback: `${callbackBase}/makemove/${nonce}`,
      history: match.history,
    }),
  });
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

app.post('/startmatch', async (req, res) => {
  let botId0, botId1, gameId;
  try {
    ({ bots: [botId0, botId1], game: gameId } = req.body);
  } catch (err) {
    res.sendStatus(400);
    return;
  }
  // TODO: validate inputs
  const bot0 = db.get('bots').get(botId0).value();
  const bot1 = db.get('bots').get(botId1).value();
  const game = db.get('games').get(gameId).value();

  let matchId;
  do {
    matchId = uuidv4();
  } while (db.get('matches').has(matchId).value());

  let matchState = {
    id: matchId,
    game: game.id,
    bots: [bot0.id, bot1.id],
    history: [],
    turn: 0,
  };
  db.get('matches').set(matchId, matchState).write();
  res.send(matchState);

  console.log('asking for move');
  try {
    await askForMove(bot0, gameId, matchState);
    console.log('did it happen?')
  } catch (err) {
    console.error('yikes', err);
  }
});

app.post('/makemove/:nonce', async (req, res) => {
  let { move } = req.body;
  let nonce = req.params['nonce'];
  let noncePayload;
  try {
    noncePayload = checkAndWipeNonce(nonce, 'makemove');
  } catch (err) {
    res.sendStatus(400);
    console.log('bad nonce', nonce);
    return;
  }
  let game = db.get('games').get(noncePayload.game).value();
  let match = db.get('matches').get(noncePayload.match).value();
  if (game === undefined || match === undefined) {
    res.sendStatus(400);
    return;
  }
  // Validate move is legal
  match.history.push(move);
  db.get('matches').get(noncePayload.match).update({ history: match.history }).write();
  // TODO: Is game over? Who won? Stalemate?
  // updateMatchState(game, match, move);
  match.turn ^= 1;
  let otherBot = db.get('bots').get(match.bots[match.turn]).value();
  try {
    await askForMove(otherBot, game.id, match);
  } catch (err) {
    console.error(err);
  }
  res.sendStatus(200);
});

app.listen(3000);

