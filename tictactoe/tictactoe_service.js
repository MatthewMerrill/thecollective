const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

app.use(bodyParser.json());
app.use(cors());

class GameState {
  constructor() {
    this.board = {};
    this.turn = 0;
  }
  
  validMove(move) {
    return !this.hasWinner() && (this.board[move] === undefined) && (0 <= move && move < 9);
  }
  
  appendMove(move, who) {
    move = 1*move;
    if (!this.validMove(move)) {
      throw new Error('Invalid Move!');
    }
    this.board[move] = who;
  }

  appendHistory(history) {
    let who = 0;
    for (let move of history) {
      if (this.hasWinner()) {
        throw new Error('Game kept going after ending?');
      }
      this.appendMove(move, who);
      who = 1 - who;
    }
  }
  
  getWinner() {
    for (let rowBase = 0; rowBase < 9; rowBase += 3) {
      if (this.board[rowBase] !== undefined
          && this.board[rowBase + 0] === this.board[rowBase + 1]
          && this.board[rowBase + 1] === this.board[rowBase + 2]) {
        return this.board[rowBase]; 
      }
    }
    for (let colBase = 0; colBase < 3; colBase += 1) {
      if (this.board[colBase] !== undefined
          && this.board[colBase + 0] === this.board[colBase + 3]
          && this.board[colBase + 3] === this.board[colBase + 6]) {
        return this.board[colBase];
      }
    }
    if (this.board[0] !== undefined
        && this.board[0] === this.board[4]
        && this.board[4] === this.board[8]) {
      return this.board[0];
    }
    if (this.board[2] !== undefined
        && this.board[2] === this.board[4]
        && this.board[4] === this.board[6]) {
      return this.board[2];
    }
    return undefined;
  }

  hasWinner() {
    return this.getWinner() !== undefined;
  }

  render() {
    let grid = [[' ', ' ', ' '],[' ', ' ', ' '],[' ', ' ', ' ']];
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 3; c += 1) {
        let ch = this.board[r*3 + c];
        if (ch !== undefined) {
          grid[r][c] = 'X0'[ch];
        }
      }
    }
    return grid;
  }
}

app.post('/validateMove', (req, res) => {
  let {history, move} = req.body;
  let state = new GameState();
  state.appendHistory(history);
  let isLegal = state.validMove(move);
  state.appendMove(move, history.length % 2);
  let winner = state.getWinner();
  res.send({isLegal, winner, render: state.render() });
});

app.post('/render', (req, res) => {
  console.log('we got a request!');
  try {
  let history = req.body;
  let state = new GameState();
  state.appendHistory(history);
  res.send(state.render());
  } catch(err) { console.error(err); }
  console.log('there you go');
});

app.post('/getwinner', (req, res) => {
  let {history} = req.body;
  let state = new GameState();
  state.appendHistory(history);
  res.send(state.getWinner());
});

app.get('/ping', (req, res) => {
  res.send('ack');
});

const port = 7001;
console.log(`Listening on ${port}...`);
app.listen(port);

