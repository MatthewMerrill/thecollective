import * as React from 'react';
import * as ReactDOM from 'react-dom';

setTimeout(async () => {
  try {
    let botsResponse = await fetch('http://localhost:3000/bots');
    let bots = Object.values(await botsResponse.json());
    const element = <ul>{bots.map(bot => <li key={bot.id}>{bot.name}</li>)}</ul>;

    ReactDOM.render(
      element,
      document.getElementById('bots-root')
    );
  } catch (e) {
    console.error(e);
  }
}, 120);

