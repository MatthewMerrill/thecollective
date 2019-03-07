import * as React from 'react';
import * as ReactDOM from 'react-dom';

setTimeout(async () => {
  try {
    let matchResponse = await fetch('http://localhost:3000/matches');
    let matches = Object.values(await matchResponse.json());
    const element = matches.map(match =>
      <div className="card" key={match.id}>
        <div className="card-title">{match.bots[0]} vs {match.bots[1]}</div>
        <div className="card-content">
          <li>Playing {match.game}</li>
          <li>{match.movesIn} moves in, {match.bots[match.turn]} to play</li>
        </div>
      </div>
    );

    ReactDOM.render(
      element,
      document.getElementById('root')
    );
  } catch (e) {
    console.error(e);
  }
}, 120);

