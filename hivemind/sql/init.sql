CREATE TABLE IF NOT EXISTS bots (
  id            INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  author_id     LONG NOT NULL,
  game_id       LONG NOT NULL,
  webhook       TEXT NOT NULL,
  created       DATETIME DEFAULT CURRENT_TIMESTAMP,
  elo           INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  joined        DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS oauth_registrations (
  user_id       INTEGER NOT NULL,
  provider      INTEGER NOT NULL,
  oauth_id      INTEGER NOT NULL,

  PRIMARY KEY (provider, oauth_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS games (
  id            INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  webhook       TEXT NOT NULL,
  first_render  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
  id            INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  game_id       INTEGER NOT NULL,
  winner_id     INTEGER NULL,
  started       DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended         DATETIME DEFAULT NULL,

  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (winner_id) REFERENCES bots(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS match_membership (
  match_id      INTEGER NOT NULL,
  bot_id        INTEGER NOT NULL,
  position      INTEGER NOT NULL,
  PRIMARY KEY (match_id, bot_id),
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
  CONSTRAINT positions_unique UNIQUE (match_id, position)
);

CREATE TABLE IF NOT EXISTS moves (
  match_id      INTEGER NOT NULL,
  bot_id        INTEGER NOT NULL,
  move          TEXT NOT NULL,
  idx           INTEGER NOT NULL,
  timestamp     DATETIME NOT NULL,
  render_after  TEXT NOT NULL,

  PRIMARY KEY (match_id, idx),
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
);

