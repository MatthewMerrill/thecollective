import * as React from 'react';
import * as ReactDOM from 'react-dom';

import {MatchWidget} from '/components/match_widget.js';

setTimeout(async () => {
  try {
    let matchResponse = await fetch('http://localhost:3000/matches');
    let matches = Object.values(await matchResponse.json());
    const element = matches.map(match =>
        <div className="shift-in" key={match.id}>
          <MatchWidget match={match} />
        </div>
    );

    ReactDOM.render(
      element,
      document.getElementById('root')
    );
  } catch (e) {
    console.error(e);
  }
  // TODO: Speed up
}, 800);

