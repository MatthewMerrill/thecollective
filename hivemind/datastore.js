// WHYYYYYYYYYY DID I CHOOSE TO WRITE SQLLLLLLLLLLLLLLLLLLLLLLLLLL
const util = require('util');
const fs = require('fs');
const path = require('path');
const uuidv4 = require('uuid/v4');

const readFile = util.promisify(fs.readFile);

function assignRowResult(result, into) {
  for (let [key, value] of Object.entries(result)) {
    let lhs = into;
    let path = key.split('$');
    for (let pathIdx = 0; pathIdx + 1 < path.length; pathIdx += 1) {
      lhs = lhs[path[pathIdx]];
    }
    lhs[path[path.length - 1]] = value;
  }
  return into;
}

module.exports.SqliteDataStore = class SqliteDataStore {
  
  constructor() {
    const Database = require('sqlite-async');
    this.db = new Database();
  }

  async initialize(fileName) {
    await this.db.open(fileName);
    let initScript =
      await readFile(path.join(__dirname, 'sql/init.sql'), 'utf-8');
    await this.db.exec(initScript);
    await this.db.get('PRAGMA foreign_keys = ON');

  }

  async close() {
    await this.db.close();
  }

  async insertGame(game) {
    let {lastID} = await this.db.run(
      `
      INSERT INTO games (
        name, webhook, first_render
      )
      VALUES (?, ?, ?)
      `,
      [game.name, game.webhook, JSON.stringify(game.firstRender)]);
    return lastID;
  }

  async getGames() {
    return await this.db.all(
      `
      SELECT id, name FROM games
      `, []);
  }

  async getGame(gameId, {includeWebhook=false}) {
    return await this.db.get(
      `
      SELECT
        game.id as id,
      ${includeWebhook ? 'game.webhook as webhook,' : ''}
        game.name as name
      FROM games game
      WHERE game.id=?
      `,
      [gameId]);
  }

  async insertOAuthUser(user, oauthProvider, oauthId) {
    let user_id = undefined;
    await this.db.transaction(async db => {
      user_id = await this.insertUser(user);
      await this.db.run(`
        INSERT INTO oauth_registrations
          (user_id, provider, oauth_id)
        VALUES
          (?, ?, ?)
        `,
        [user_id, oauthProvider, oauthId]
      );
    });
    return user_id;
  }

  async getUserIdFromOAuth(oauthProvider, oauthId) {
    let result = await this.db.get(
      `
      SELECT user_id as id
      FROM oauth_registrations reg
      WHERE provider=? and oauth_id=?
      `,
      [oauthProvider, oauthId]
    );
    return result === undefined ? undefined : result.id;
  }

  async insertUser(user) {
    let {lastID} = await this.db.run(
      `
      INSERT INTO users (
        name, email
      )
      VALUES (?, ?)
      `,
      [user.name, user.email]);
    return lastID;
  }

  async getPrivateUserProfile(userId) {
    let profile = await this.db.get(
      `
      SELECT
        user.id as id,
        user.name as name,
        user.email as email,
        user.is_admin as isAdmin
      FROM users user
      WHERE user.id=?
      `,
      [userId]);
    let oauths = await this.db.all(
      `
      SELECT
        oauth.provider as provider
      FROM oauth_registrations oauth
      WHERE oauth.user_id=?
      `,
      [userId])
    profile.oauth_services = [];
    for (let {provider} of oauths) {
      profile.oauth_services.push(provider);
    }
    if (!profile.isAdmin) {
      delete profile.isAdmin;
    }
    return profile;
  }

  async isAdminUser(userId) {
    if (userId === undefined) {
      return false;
    }
    let {isAdmin} = await this.db.get(
      `
      SELECT
        user.is_admin as isAdmin
      FROM users user
      WHERE user.id=?
      `,
      [userId]);
    return isAdmin;
  }

  async insertBot(bot) {
    await this.db.run(
      `
      INSERT INTO bots (
        name, author_id, game_id, webhook
      )
      VALUES (?, ?, ?, ?)
      `,
      [
        bot.name,
        typeof bot.author === 'object' ? bot.author.id : bot.author || bot.authorId,
        typeof bot.game === 'object' ? bot.game.id : bot.game || bot.gameId,
        bot.webhook
      ]);
  }

  async getBot(botId, { includeWebhook = false}) {
    let result = await this.db.get(
      `
      SELECT
        bot.id as id,
        bot.name as name,
      ${includeWebhook ? 'bot.webhook as webhook,' : ''}
        author.id as author$id,
        author.name as author$name,
        game.id as game$id,
        game.name as game$name
      FROM bots bot
      INNER JOIN users author on author.id=bot.author_id
      INNER JOIN games game on game.id=bot.game_id
      WHERE bot.id=?
      `,
      [botId]);
    // TODO: should this really throw? why not pass back undefined?
    // It is an exceptional condition though...
    if (result === undefined) {
      throw new Error(`No bot exists with id=${botId}`);
    }
    return assignRowResult(result, { author: {}, game: {} });
  }

  async getBots() {
    let result = await this.db.all(
      `
      SELECT
        bot.id as id,
        bot.name as name,
        author.id as author$id,
        author.name as author$name,
        game.id as game$id,
        game.name as game$name
      FROM bots bot
      INNER JOIN users author on author.id=bot.author_id
      INNER JOIN games game on game.id=bot.game_id
      `, []);
    console.log(result);
    return result.map(row => assignRowResult(row, {author:{}, game:{}}));
  }

  async getMatches() {
    let matches = await this.db.all(
      `
      SELECT
        match.id as id,
        game.id as game$id,
        game.name as game$name,
        bot0.id as bots$0$id,
        bot0.name as bots$0$name,
        bot1.id as bots$1$id,
        bot1.name as bots$1$name,
        count(move) as movesIn,
        count(move) % 2 as turn,
        match.started as started,
        match.ended as ended,
        winner.id as winner$id,
        winner.name as winner$name
      FROM matches match
      INNER JOIN match_membership member0 ON member0.match_id=match.id and member0.position=0
      INNER JOIN match_membership member1 ON member1.match_id=match.id and member1.position=1
      INNER JOIN bots bot0 ON member0.bot_id=bot0.id
      INNER JOIN bots bot1 ON member1.bot_id=bot1.id
      LEFT JOIN bots winner ON winner.id=match.winner_id
      INNER JOIN games game ON game.id=match.game_id
      LEFT JOIN moves move ON move.match_id=match.id
      GROUP BY match.id
      `, []); // holy guacamole
    return matches.map(match => assignRowResult(match, {game:{},winner:{},bots:[{},{}]}));
  }

  async getMatch(id) {
    let match = await this.db.get(
      `
      SELECT
        match.id as id,
        game.id as game$id,
        game.name as game$name,
        game.first_render as game$first_render,
        bot0.id as bots$0$id,
        bot0.name as bots$0$name,
        bot1.id as bots$1$id,
        bot1.name as bots$1$name,
        count(move) % 2 as turn,
        match.started as started,
        match.ended as ended,
        winner.id as winner$id,
        winner.name as winner$name
      FROM matches match
      INNER JOIN match_membership member0 ON member0.match_id=match.id and member0.position=0
      INNER JOIN match_membership member1 ON member1.match_id=match.id and member1.position=1
      INNER JOIN bots bot0 ON member0.bot_id=bot0.id
      INNER JOIN bots bot1 ON member1.bot_id=bot1.id
      LEFT JOIN bots winner ON winner.id=match.winner_id
      INNER JOIN games game ON game.id=match.game_id
      LEFT JOIN moves move ON move.match_id=match.id
      WHERE match.id=?
      GROUP BY match.id
      `, [id]);
    if (match === undefined) {
      return undefined;
    }
    match = assignRowResult(match, {game:{},winner:{},bots:[{},{}]});
    let moves = await this.db.all(
      `
      SELECT
        move.move as move,
        move.idx as idx,
        move.render_after as render_after,
        move.timestamp as timestamp
      FROM moves move
      WHERE move.match_id=?
      `,
      [id]);
    match.moves = moves;
    return match;
  }

  async insertMove(move) {
    await this.db.run(
      `
      INSERT INTO moves (
        match_id,
        bot_id,
        move,
        idx,
        timestamp,
        render_after
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        move.matchId,
        move.botId,
        move.move,
        move.idx,
        move.timestamp,
        move.renderAfter
      ]);
  }

  async getMove(matchId, moveIdx) {
    return this.db,get(
      `
      SELECT
        move.move as move,
        move.idx as idx,
        move.render_after as render,
        move.timestamp as timestamp
      FROM moves move
      WHERE move.match_id=? and move.idx=?
      `,
      [matchId, moveIdx]);
  }

  async insertMatch(match) {
    let matchId;
    await this.db.transaction(async db => {
      let {lastID} = await db.run(
        `
        INSERT INTO matches (
          game_id
        )
        VALUES (?)
        `, [typeof match.game === 'object' ? match.game.id : match.game]);
      matchId = lastID;
      let position = 0;
      for (let bot of match.bots) {
        await db.run(
          `
          INSERT INTO match_membership (
            match_id, bot_id, position
          )
          VALUES (?, ?, ?)
          `,
          [
            matchId,
            bot.id !== undefined ? bot.id : bot,
            position
          ]);
        position += 1;
      }
    });
    return matchId;
  }

  async generateMakeMoveCallback(matchId, botId, moveIdx, deadline) {
    let uuid;
    do {
      uuid = uuidv4();
      try {
        this.db.run(
          `
          INSERT INTO makemove_callbacks (
            match_id, bot_id, token, idx, deadline
          )
          VALUES (?, ?, ?, ?, ?)
          `,
          [matchId, botId, uuid, moveIdx, deadline]);
        break;
      } catch (err) { /* probably conflicting uuid */ }
    } while (true);
    return uuid;
  }

  async getMakeMoveContext(matchId, moveIdx, token) {
    return await this.db.get(
      `
      SELECT
        match_id, bot_id, deadline
      FROM makemove_callbacks
      WHERE token=? and match_id=? and idx=?
      `,
      [token, matchId, moveIdx]);
  }

}
