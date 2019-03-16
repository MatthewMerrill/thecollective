import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as QueryString from 'query-string';

import {MatchWidget} from '/components/match_widget.js';

function MatchViewer(props) {
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

class WatchPage extends React.Component {
  constructor(props) {
    super(props);
    this.match = props.match;
    this.state = {
      nextMoveIdx: -1,
    };
  }

  componentDidMount() {
    fetch('http://localhost:3000/match/' + this.props.matchId)
      .then(res => res.json())
      .then(match => {
        this.match=match;
        this.renders = [this.match.game.first_render]
          .concat(this.match.moves.map(move => move.render_after));
        this.setState({
          nextMoveIdx: this.match.moves.length,
        });
      })
  }

  render() {
    if (!this.match) {
      return <div className="card-title temp">Loading...</div>
    }
    return <div>
        <div className="card-title">Watching: {this.match.bots[0].name} vs {this.match.bots[1].name}</div>
        <div className="card shift-in">
          <div className="card-content">
            <MatchViewer matchRender={this.state.render||[]}/>
          </div>
        </div>
        <div className="card shift-in">
          <div className="card-title">History</div>
          <div className="card-content">
            {JSON.stringify(this.match.history) || 'No history to show.'}
            { this.match.winner !== undefined && <li>Winner: {this.match.bots[this.match.winner]}</li>}
          </div>
        </div>
      </div>
  }
}

setTimeout(async () => {
  try {
    let query = QueryString.parse(location.search);
    let matchId = query.id;
    ReactDOM.render(
      <WatchPage matchId={matchId}></WatchPage>,
      document.getElementById('root')
    );
  } catch (e) {
    console.error(e);
  }
  // TODO: Speed up
}, 200);

