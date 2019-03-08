import * as React from 'React';
export class MatchWidget extends React.Component {
  constructor(props) {
    super(props);
    this.match = props.match;
  }
  render() {
    return (
      <div className="card shift-in" key={this.props.match.id}>
        <div className="card-title">{this.props.match.bots[0]} vs {this.props.match.bots[1]}</div>
        <div className="card-content">
          <li>Playing {this.props.match.game}</li>
          <li>{this.props.match.movesIn} moves in, {this.props.match.bots[this.props.match.turn]} to play</li>
        </div>
      </div>
    );
  }
}
