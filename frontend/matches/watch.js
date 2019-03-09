import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as QueryString from 'query-string';

import {MatchWidget} from '/components/match_widget.js';

function MatchViewer(props) {
  console.log(props);
  return <table className="matchRender">
      <tbody>
        {props.matchRender.map((row, rIdx) => 
          <tr key={rIdx}>{row.map((cell, cIdx) =>
            <td key={cIdx}>{cell}</td>)}
          </tr>
        )}
      </tbody>
    </table>;
}

setTimeout(async () => {
  try {
    let query = QueryString.parse(location.search);
    let matchId = query.id;
    setInterval(async () => {
      let res = await fetch('http://localhost:3000/match/' + matchId);
      let match = await res.json();
      console.log(match);
      const element = (
        <div>
          <div className="card-title">Watching: {match.bots[0]} vs {match.bots[1]}</div>
          <div className="card shift-in">
            <div className="card-content">
              <MatchViewer matchRender={match.render}/>
            </div>
          </div>
          <div className="card shift-in">
            <div className="card-title">History</div>
            <div className="card-content">
              {JSON.stringify(match.history) || 'No history to show.'}
              { match.winner !== undefined && <li>Winner: {match.bots[match.winner]}</li>}
            </div>
          </div>
        </div>
      );

      ReactDOM.render(
        element,
        document.getElementById('root')
      );
    }, 2000);
  } catch (e) {
    console.error(e);
  }
  // TODO: Speed up
}, 200);

