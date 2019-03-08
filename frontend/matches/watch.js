import * as React from 'react';
import * as ReactDOM from 'react-dom';

import {MatchWidget} from '/components/match_widget.js';

setTimeout(async () => {
  try {
    const element = <div className="card-title">Watching: AAAA vs BBBB</div>;

    ReactDOM.render(
      element,
      document.getElementById('root')
    );
  } catch (e) {
    console.error(e);
  }
  // TODO: Speed up
}, 800);

