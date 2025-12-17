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
  role_id          INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
  username         TEXT    NOT NULL UNIQUE,
  nickname         TEXT    NOT NULL UNIQUE,
  hashed_pass      TEXT    NOT NULL,
  current_balance  INTEGER NOT NULL DEFAULT 0 CHECK (current_balance >= 0),
  profile_picture  TEXT
);

-- Категории игр
CREATE TABLE IF NOT EXISTS game_categories (
  category_id    INTEGER PRIMARY KEY,
  name           TEXT NOT NULL UNIQUE,
  description    TEXT
);

-- Игры/автоматы
CREATE TABLE IF NOT EXISTS games (
  game_id      INTEGER PRIMARY KEY,
  category_id  INTEGER NOT NULL REFERENCES game_categories(category_id) ON DELETE CASCADE,
  name         TEXT NOT NULL UNIQUE,
  min_bet      INTEGER NOT NULL CHECK (min_bet >= 0),
  max_bet      INTEGER NOT NULL CHECK (max_bet >= min_bet),
  config       TEXT NOT NULL,
  game_icon    TEXT
);

-- Игровые раунды (история)
CREATE TABLE IF NOT EXISTS game_rounds (
  round_id                INTEGER PRIMARY KEY,
  profile_id              INTEGER NOT NULL REFERENCES players(profile_id) ON DELETE CASCADE,
  game_id                 INTEGER NOT NULL REFERENCES games(game_id) ON DELETE CASCADE,
  timestamp               TEXT NOT NULL,
  money_win_lose_ammount  INTEGER NOT NULL
);

-- Индексы для выборок истории
CREATE INDEX IF NOT EXISTS idx_rounds_profile_ts
  ON game_rounds(profile_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_rounds_game_ts
  ON game_rounds(game_id, timestamp DESC);
