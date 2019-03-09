import * as React from 'react';

export function MatchWidget(props) {
  let watchLink = `/matches/watch.html?id=${props.match.id}`
  let descriptionLine = (props.match.winner === undefined)
      ? <li>{props.match.movesIn} moves in, {props.match.bots[props.match.turn]} to play</li>
      : <li>Winner: {props.match.bots[props.match.winner]}</li>;
  return (
    <div className="card" key={props.match.id}>
      <div className="card-title">
        <a href={watchLink}>{props.match.bots[0]} vs {props.match.bots[1]}</a>
      </div>
      <div className="card-content">
        <li>Playing {props.match.game}</li>
        {descriptionLine}
      </div>
    </div>
  );
}
