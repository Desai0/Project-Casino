PRAGMA foreign_keys = ON;

-- Роли пользователей
CREATE TABLE IF NOT EXISTS roles (
  role_id    INTEGER PRIMARY KEY,
  role_name  TEXT NOT NULL UNIQUE
);

-- Права доступа (связь 1:1 с ролями)
CREATE TABLE IF NOT EXISTS permissions (
  role_id              INTEGER PRIMARY KEY REFERENCES roles(role_id) ON DELETE CASCADE,
  can_edit_balance     INTEGER NOT NULL DEFAULT 0 CHECK (can_edit_balance IN (0, 1)),
  can_view_debug_info  INTEGER NOT NULL DEFAULT 0 CHECK (can_view_debug_info IN (0, 1)),
  streamer_mode_access INTEGER NOT NULL DEFAULT 0 CHECK (streamer_mode_access IN (0, 1)),
  can_reset_history    INTEGER NOT NULL DEFAULT 0 CHECK (can_reset_history IN (0, 1))
);

-- Игроки (профили)
CREATE TABLE IF NOT EXISTS players (
  profile_id       INTEGER PRIMARY KEY,
  role_id          INTEGER NOT NULL DEFAULT 1 REFERENCES roles(role_id) ON DELETE RESTRICT,
  username         TEXT    NOT NULL UNIQUE CHECK (length(username) >= 3 AND length(username) <= 50),
  nickname         TEXT    NOT NULL UNIQUE CHECK (length(nickname) >= 3 AND length(nickname) <= 50),
  email            TEXT    NOT NULL UNIQUE CHECK (email LIKE '%_@_%._%'),
  hashed_pass      TEXT    NOT NULL CHECK (length(hashed_pass) >= 60),
  current_balance  INTEGER NOT NULL DEFAULT 0 CHECK (current_balance >= 0),
  profile_picture  TEXT    CHECK (length(profile_picture) <= 500),
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  last_login       TEXT
);

-- Сессии для аутентификации
CREATE TABLE IF NOT EXISTS sessions (
  session_id    INTEGER PRIMARY KEY,
  profile_id    INTEGER NOT NULL REFERENCES players(profile_id) ON DELETE CASCADE,
  token         TEXT NOT NULL UNIQUE CHECK (length(token) >= 32),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at    TEXT NOT NULL,
  is_active     INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);

-- Категории игр
CREATE TABLE IF NOT EXISTS game_categories (
  category_id    INTEGER PRIMARY KEY,
  name           TEXT NOT NULL UNIQUE CHECK (length(name) >= 2 AND length(name) <= 100),
  description    TEXT CHECK (length(description) <= 1000)
);

-- Игры/автоматы
CREATE TABLE IF NOT EXISTS games (
  game_id      INTEGER PRIMARY KEY,
  category_id  INTEGER NOT NULL REFERENCES game_categories(category_id) ON DELETE CASCADE,
  name         TEXT NOT NULL UNIQUE CHECK (length(name) >= 2 AND length(name) <= 100),
  min_bet      INTEGER NOT NULL CHECK (min_bet > 0),
  max_bet      INTEGER NOT NULL CHECK (max_bet >= min_bet),
  config       TEXT NOT NULL,
  game_icon    TEXT
);

-- Игровые раунды (история)
CREATE TABLE IF NOT EXISTS game_rounds (
  round_id                INTEGER PRIMARY KEY,
  profile_id              INTEGER NOT NULL REFERENCES players(profile_id) ON DELETE CASCADE,
  game_id                 INTEGER NOT NULL REFERENCES games(game_id) ON DELETE CASCADE,
  timestamp               TEXT NOT NULL DEFAULT (datetime('now')),
  money_win_lose_ammount  INTEGER NOT NULL
);

-- Платежи Stripe
CREATE TABLE IF NOT EXISTS stripe_payments (
  payment_id INTEGER PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES players(profile_id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

-- Индексы для выборок истории
CREATE INDEX IF NOT EXISTS idx_rounds_profile_ts
  ON game_rounds(profile_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_rounds_game_ts
  ON game_rounds(game_id, timestamp DESC);

-- Индексы для аутентификации
CREATE INDEX IF NOT EXISTS idx_players_email
  ON players(email);

CREATE INDEX IF NOT EXISTS idx_players_username
  ON players(username);

CREATE INDEX IF NOT EXISTS idx_sessions_token
  ON sessions(token) WHERE is_active = 1;

CREATE INDEX IF NOT EXISTS idx_sessions_profile
  ON sessions(profile_id, is_active);

-- Индексы для платежей
CREATE INDEX IF NOT EXISTS idx_payments_profile
  ON stripe_payments(profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_stripe_id
  ON stripe_payments(stripe_payment_intent_id);
