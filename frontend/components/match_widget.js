import * as React from 'react';

export function MatchWidget(props) {
  console.log(props);
  let watchLink = `/matches/watch.html?id=${props.match.id}`
  let descriptionLine = (props.match.winner.id === null)
      ? <li>{props.match.movesIn} moves in, {props.match.bots[props.match.turn].name} to play.</li>
      : <li>Winner: {props.match.winner.name}!</li>;
  return (
    <div className="card" key={props.match.id}>
      <div className="card-title">
        <a href={watchLink}>{props.match.bots[0].name} vs {props.match.bots[1].name}</a>
      </div>
      <div className="card-content">
        <li>Playing {props.match.game.name}</li>
        {descriptionLine}
      </div>
    </div>
  );
}
