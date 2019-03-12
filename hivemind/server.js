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
const cron = require('cron');

const callbackBase = 'http://localhost:3000';

db.defaults({
  bots: {},
  games: {},
  matches: {},
  nonces: {},
}).write();

app.use(bodyParser.json());
app.use(cors());

function getNonce(purpose, payload, duration) {
  let nonce;
  let curtime = new Date().getTime();
  let expire_time = curtime + (duration || 15000);
  do {
    nonce = uuidv4();
  } while (db.get('nonces').has(nonce).value());
  if (db.get('nonces').set(nonce, {nonce, purpose, expire_time, payload}).write()) {
    return nonce;
  }
}

function checkAndWipeNonce(nonce, purpose) {
  let record = db.get('nonces').get(nonce).value();
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

async function getRender(game, history) {
  let renderRes = await fetch(game.hook + '/render', {
    method: 'post',
    headers: {
      'Content-type': 'application/json',
    },
    body: JSON.stringify(history),
  });;
  return renderRes.json();
}

app.get('/games', (req, res) => {
  let games = db.get('games').values();
  let gameList = [];
  for (let game of games) {
    gameList.push({
      id: game.id,
      name: game.name,
    });
  }
  res.send(gameList);
});

app.get('/bots', (req, res) => {
  const bots = db.get('bots').value();
  // TODO: hide private stuffs
  res.send(bots);
});

app.post('/bots', (req, res) => {
  const payload = {
    bot: {
      name: req.body.botName,
      game: req.body.game,
      hook: req.body.butHook,
    },
    author: {
      name: req.body.authorName,
      email: req.body.authorEmail,
    }
  }
  const nonce = getNonce('registration', payload, 15000 * 60);
  res.sendStatus(201);
});

app.get('/matches', async (req, res) => {
  const bots = db.get('bots').value();
  const games = db.get('games').value();
  const matchList = [];
  for (let match of Object.values(db.get('matches').value())) {
    let { bots: [botId0, botId1], game: gameId } = match;
    if (!match.render) {
      match.render = await getRender(games[gameId], match.history);
      db.get('matches').get(match.id).set('render', match.render).write();
    }
    matchList.push({
      id: match.id,
      game: games[gameId].name,
      bots: [bots[botId0].name, bots[botId1].name],
      movesIn: match.history.length,
      turn: match.turn,
      winner: match.winner,
      render: match.render,
    });
  }
  res.send(matchList);
});

app.get('/match/:id', async (req, res) => {
  // TODO validate
  let match = db.get('matches').get(req.params['id']).value();
  let game = db.get('games').get(match.game).value();
  let botNames = [];
  for (let botId of match.bots) {
    botNames.push(db.get('bots').get(botId).get('name').value());
  }
  if (!match.render) {
    match.render = await getRender(game, match.history);
    db.get('matches').get(match.id).set('render', match.render).write();
  }
  res.send({
    id: match.id,
    game: game.name,
    bots: botNames,
    history: match.history,
    turn: match.turn,
    winner: match.winner,
    render: match.render,
  });
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


  let render = await getRender(game, []);
  let matchState = {
    id: matchId,
    game: game.id,
    bots: [bot0.id, bot1.id],
    history: [],
    turn: 0,
    render,
  };
  db.get('matches').set(matchId, matchState).write();
  res.send(matchState);

  try {
    await askForMove(bot0, gameId, matchState);
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
  let isLegal, winner, render;
  try {
    let validationRes = await fetch(`${game.hook}/validateMove`, {
      method: 'post',
      headers: {
        'Content-type': 'application/json',
      },
      body: JSON.stringify({
        history: match.history,
        move,
      }),
    });
    ({isLegal, winner, render} = await validationRes.json());
  } catch (err) {
    // panic! at the stack trace
    console.error('error while validating move', err);
  }

  if (!isLegal) {
    // TODO: make game over or something
    console.error('REE BAD MOVE');
    res.sendStatus(400);
    return;
  }

  let updates = {};
  match.history.push(move);
  updates.history = match.history;
  if (render === undefined) {
    render = await getRender(game, match.history);
  }
  updates.render = render;

  if (winner !== undefined) {
    updates.winner = winner;
    updates.turn = -1;
    console.log('we have a winner', winner);
  }
  else {
    match.turn ^= 1;
    let otherBot = db.get('bots').get(match.bots[match.turn]).value();
    try {
      await askForMove(otherBot, game.id, match);
    } catch (err) {
      console.error(err);
    }
    updates.turn = match.turn;
  }
  console.log(updates);
  db.get('matches').get(match.id).assign(updates).write();
  res.sendStatus(200);
});

(async () => {
  cron.job('0 * * * * * ', () => {
    try {
      const curtime = new Date().getTime();
      let toRemove = db.get('nonces')
        .values()
        .filter(record => {
          return record.expire_time === undefined
            || record.expire_time < curtime;
        })
        .value();
      for (let item of toRemove) {
        db.get('nonces')
          .unset(item.nonce)
          .write();
      }
    } catch (err) {
      console.error(err);
    }
  }, null, true, 'America/Los_Angeles')
})();

app.listen(3000);

