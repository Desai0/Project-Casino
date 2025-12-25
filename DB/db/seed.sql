-- Роли пользователей
INSERT INTO roles (role_id, role_name) VALUES
  (1, 'Player'),
  (2, 'Streamer'),
  (3, 'Admin')
ON CONFLICT DO NOTHING;

-- Права доступа для ролей
INSERT INTO permissions (role_id, can_edit_balance, can_view_debug_info, streamer_mode_access, can_reset_history) VALUES
  (1, 0, 0, 0, 0),  -- Player: нет прав
  (2, 0, 1, 1, 0),  -- Streamer: может видеть debug и использовать streamer mode
  (3, 1, 1, 1, 1)   -- Admin: все права
ON CONFLICT DO NOTHING;

-- Стартовые категории игр
INSERT INTO game_categories (category_id, name, description) VALUES
  (1, 'Video Slots', 'Классические и видео-слоты'),
  (2, 'Table Games', 'Карточные и настольные игры'),
  (3, 'Roulette', 'Европейская/американская рулетка')
ON CONFLICT DO NOTHING;

-- Примеры игр
INSERT INTO games (game_id, category_id, name, min_bet, max_bet, config, game_icon) VALUES
  (1, 1, 'Golden Aztec', 100, 10000, '{"rtp": 0.96, "paytable": {}}', '{"icon": "golden_aztec.png"}'),
  (2, 2, 'European Blackjack', 100, 20000, '{"dealer_stands": 17, "blackjack_payout": 1.5}', '{"icon": "blackjack.png"}'),
  (3, 3, 'European Roulette', 100, 15000, '{"wheel_type": "european", "payouts": {}}', '{"icon": "roulette.png"}')
ON CONFLICT DO NOTHING;
