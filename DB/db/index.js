// Удобный единый экспорт DAO
module.exports = {
  db: require('./init'),
  players: require('./users'),
  rounds: require('./operations'),
  categories: require('./categories'),
  games: require('./games'),
  roles: require('./roles'),
  payments: require('./payments'),
  statistics: require('./statistics'),
};
