import * as React from 'react';
import * as ReactDOM from 'react-dom';

const API_BASE = process.env.API_BASE;

async function loadGameList() {
  try {
    let gamesResponse = await fetch(`${API_BASE}/games`);
    let games = await gamesResponse.json();
    const element = games.length
        ? <ul>
            {games.map(game => <li key={game.id}>{game.name}</li>)}
          </ul>
        : <ul><li>There are no registered games!</li></ul>;

    ReactDOM.render(
      element,
      document.getElementById('games-root')
    );
  } catch (e) {
    console.error(e);
  }
}

class CreateGameForm extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      dirty: true,
      gameOptions: [],
      botName: '',
      botGame: undefined,
      botWebhook: '',
    };
    this.handleChange = this.handleChange.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
  }

  componentDidMount() {
    fetch(`${API_BASE}/games`, {headers:{'Accept':'application/json'}})
      .then(response => response.json())
      .then(gameOptions => this.setState({gameOptions}));
  }

  handleChange(event) {
    const target = event.target;
    const name = target.name;
    const value = target.value;
    this.setState({ dirty: true, [name]: value });
    console.log(this.state)
  }

  onSubmit(event) {
    console.log('submitting', this.state);
    this.state.submitting = true;
    fetch(`${API_BASE}/games`, {
      method: 'post',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        name: this.state.gameName,
        webhook: this.state.gameWebhook,
      }),
    }).then(res => this.state.submitting = false);
    event.preventDefault();
  }

  render() {
    if (!window.isAdmin) {
      return <div></div>
    }
    return <form onSubmit={this.onSubmit}>
        <div className="card-title">Create Game</div>
        <div className="card-content" id="gameCreateForm">
          <input required value={this.state.gameName} onChange={this.handleChange}
                 name="gameName" type="text" autoComplete="off" placeholder="Game Name"/>
          <input required value={this.state.gameWebhook} onChange={this.handleChange}
                 name="gameWebhook" type="url" autoComplete="url"
                 placeholder="http://webhook.example.com/hook" pattern="http(s)?://.*"/>
          <button className="btn">Submit</button>
        </div>
      </form>;
  }
  catch (e) {
    console.error(e);
  }
}

setTimeout(async () => {
  loadGameList();
  if (window.isAdmin) {
    ReactDOM.render(
      <CreateGameForm></CreateGameForm>,
      document.getElementById('create-game'));
  }
}, 120);

