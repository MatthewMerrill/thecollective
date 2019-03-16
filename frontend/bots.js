import * as React from 'react';
import * as ReactDOM from 'react-dom';

const API_BASE = process.env.API_BASE;

async function loadBotList() {
  try {
    let botsResponse = await fetch(`${API_BASE}/bots`);
    let bots = await botsResponse.json();
    const element = bots.length
        ? <table>
            <thead>
              <tr><td>Bot Name</td><td>Author Name</td><td>Game</td></tr>
            </thead>
            <tbody>
              {bots.map(bot => <tr key={bot.id}>
                <td>{bot.name}</td><td>{bot.author.name}</td><td>{bot.game.name}</td>
              </tr>)}
            </tbody>
          </table>
        : <ul><li>There are no registered bots! Login and change that!</li></ul>;

    ReactDOM.render(
      element,
      document.getElementById('bots-root')
    );
  } catch (e) {
    console.error(e);
  }
}

class CreateBotForm extends React.Component {

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
    fetch(`${API_BASE}/bots`, {
      method: 'post',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        name: this.state.botName,
        game: this.state.botGame,
        webhook: this.state.botWebhook,
      }),
    }).then(res => this.state.submitting = false);
    event.preventDefault();
  }

  render() {
    return <form onSubmit={this.onSubmit}>
        <div className="card-title">Create Bot</div>
        <div className="card-content" id="botCreateForm">
          <select required value={this.state.botGame||'default'} onChange={this.handleChange} name="botGame">
            <option value="default" disabled>Select Game:</option>
            {this.state.gameOptions.map(game => 
              <option value={game.id} key={game.id} disabled={game.disabled}>{game.name}</option>)}
          </select>
          <input required value={this.state.botName} onChange={this.handleChange}
                 name="botName" type="text" autoComplete="off" placeholder="Bot Name"/>
          <input required value={this.state.botWebhook} onChange={this.handleChange}
                 name="botWebhook" type="url" autoComplete="url"
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
  loadBotList();
  if (loggedIn) {
    ReactDOM.render(
      <CreateBotForm></CreateBotForm>,
      document.getElementById('create-bot'));
  }
}, 120);

