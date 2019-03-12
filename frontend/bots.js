import * as React from 'react';
import * as ReactDOM from 'react-dom';

const API_BASE = process.env.API_BASE;

async function loadBotList() {
  try {
    let botsResponse = await fetch(`${API_BASE}/bots`);
    let bots = Object.values(await botsResponse.json());
    const element = <ul>{bots.map(bot => <li key={bot.id}>{bot.name}</li>)}</ul>;

    ReactDOM.render(
      element,
      document.getElementById('bots-root')
    );
  } catch (e) {
    console.error(e);
  }
}

async function loadGameList() {
  try {
    let gamesResponse = await fetch(`${API_BASE}/games`);
    let games = Object.values(await gamesResponse.json());
    const gameOptions = games.map(game => <option id={game.id} key={game.id}>{game.name}</option>);
    ReactDOM.render(
      gameOptions,
      document.getElementById('select-game')
    );
  }
  catch (e) {
    console.error(e);
  }
}

setTimeout(async () => {
  Promise.all(loadBotList(), loadGameList())
    .then(() => console.log('memes'));
}, 120);

