const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('cookie-session');

require('dotenv').config();
const callbackBase = process.env.API_BASE;

const app = express();
app.use(bodyParser.json());
app.use(cors({
  credentials: true,
  origin: [
    process.env.WEBSITE_BASE,
  ],
}));
app.use(session({
  name: 'session',
  secret: (
    (process.env.SESSION_SALT && process.env.SESSION_SALT.length)
      ? (new Date().getTime() + '')
      : '')
    + (process.env.SESSION_SECRET || '73h_C0113c71v3'),
  cookie: {
    domain: 'thecollective.mattmerr.com',
    signed: true,
  }
}));

const datastore = require('./datastore.js');
const db = new datastore.SqliteDataStore();
db.initialize('db.sqlite');

const webhookHandler = new (require('./webhook_handler.js'))(db);

const githubAuth = new (require('./github_auth.js').GitHubAuth)(db);

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

app.get('/login', githubAuth.handleUserLoginRequest.bind(githubAuth));
app.get('/logout', (req, res) => {
  req.session.user_id = undefined;
  res.redirect(process.env.WEBSITE_BASE);
});
app.get('/authorized', githubAuth.handleUserAuthorization.bind(githubAuth));
app.get('/whoami', async (req, res) => {
  try {
    if (req.session.user_id !== undefined) {
      res.send(await db.getPrivateUserProfile(req.session.user_id));
    } else {
      res.sendStatus(401);
    }
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

app.get('/games', async (req, res) => {
  let games = await db.getGames();
  let gameList = [];
  for (let game of games) {
    gameList.push({
      id: game.id,
      name: game.name,
    });
  }
  res.send(gameList);
});

app.post('/games', async (req, res) => {
  let isAdmin = req.session.user_id !== undefined
    && await db.isAdminUser(req.session.user_id);
  if (isAdmin) {
    let {name, webhook} = req.body;
    let game = { name, webhook };
    game.firstRender = await webhookHandler.getFirstRenderFromGame(game);
    await db.insertGame(game);
    res.status(201).send(JSON.stringify(game.firstRender));
  } else {
    res.sendStatus(403);
  }
});

app.get('/bots', async (req, res) => {
  const bots = await db.getBots();
  // TODO: hide private stuffs
  res.send(bots);
});

app.post('/bots', async (req, res) => {
  if (req.session.user_id !== undefined) {
    let bot = {
      name: req.body.name,
      author: req.session.user_id,
      game: req.body.game,
      webhook: req.body.webhook,
    };
    try {
      await db.insertBot(bot);
      res.sendStatus(201);
    }
    catch (err) {
      console.error('Error creating bot:', {
        user_id: req.session.user_id,
        body: req.body,
        bot: bot,
        error: err
      });
      res.sendStatus(400);
    }
  }
  else {
    res.sendStatus(401);
  }
});

app.get('/matches', async (req, res) => {
  try {
    const matches = await db.getMatches();
    res.send(matches);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

app.post('/matches', async (req, res) => {
  if (!(req.body.bots && req.body.bots.length === 2)) {
    res.sendStatus(400);
    return;
  }
  try {
    let match = {
      game: req.body.game,
      bots: req.body.bots,
    };
    console.log(match);
    let matchId = await db.insertMatch(match);
    res.send('' + matchId);
    webhookHandler.askForNextMoveForMatchId(matchId);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

app.get('/match/:id', async (req, res) => {
  let match = await db.getMatch(req.params.id);
  if (match === undefined) {
    res.sendStatus(404);
  }
  else {
    res.send(match);
  }
});

app.get('/match/:id/move/:idx', async (req, res) => {
  let move = await db.getMove(req.params.match, req.params.idx);
  if (move === undefined) {
    res.sendStatus(404);
  }
  else {
    res.send(move);
  }
});

app.post('/match/:matchId/move/:idx', async (req, res) => {
  let {matchId, idx} = req.params;
  let {move, token} = req.body;
  let curTime = new Date().getTime();
  let callbackContext = await db.getMakeMoveContext(matchId, idx, token);
  if (callbackContext && curTime < callbackContext.deadline) {
    try {
      let match = await db.getMatch(matchId);
      let game = await db.getGame(match.game.id, {includeWebhook:true});
      let newHistory = match.moves.map(move => move.move).concat([move]);
      let renderAfter = await webhookHandler.getRenderAfterHistory(game,newHistory);
      await db.insertMove({
        matchId,
        botId: callbackContext.bot_id,
        move,
        idx,
        timestamp: curTime,
        renderAfter: JSON.stringify(renderAfter),
      });
      res.sendStatus(200);
      webhookHandler.askForNextMoveForMatchId(matchId);
    } catch (err) {
      console.error(err);
      res.sendStatus(400);
    }
  }
  else {
    res.sendStatus(400);
  }
});

app.listen(3000);

