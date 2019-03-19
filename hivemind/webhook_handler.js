const nodeFetch = require('node-fetch');

class WebhookHandler {
  
  constructor(db) {
    this.db = db;
  }

  async getFirstRenderFromGame(game) {
    return this.getRenderAfterHistory(game, []);
  }

  async getRenderAfterHistory(game, history) {
    let webhook = game.webhook;
    let res = await this.fetch(`${webhook}/render`, {
      method: 'post',
      headers: {
        'Content-type': 'application/json',
      },
      body: JSON.stringify(history),
    });
    let render = await res.json();
    return render;
  }

  async askForNextMoveForMatchId(matchId) {
    let match = await this.db.getMatch(matchId);
    let bot = await this.db.getBot(match.bots[match.turn].id, {includeWebhook:true});
    let deadline = new Date().getTime() + 15000;
    let moveIdx = match.moves.length;
    let callbackUuid =
      await this.db.generateMakeMoveCallback(match.id, bot.id, moveIdx, deadline);
    let res = await this.fetch(`${bot.webhook}/getmove`, {
      method: 'post',
      headers: {
        'Content-type': 'application/json',
      },
      body: JSON.stringify({
        callback: `${process.env.API_BASE}/match/${matchId}/move/${moveIdx}`,
        history: match.moves.map(move => move.move),
        render: match.moves.length
          ? match.moves[match.moves.length-1].render_after
          : match.first_render,
        token: callbackUuid,
      }),
    });
  }

  async fetch(url, options) {
    // TODO: This should not be allowed to communicate with anything on LAN
    console.log(url, options.body);
    return nodeFetch(url, options);
  }
}

module.exports = WebhookHandler;

