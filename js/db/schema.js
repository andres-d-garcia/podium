const DB_NAME = 'podium-db';
const DB_VERSION = 1;

const STORES = {
  leagues: { keyPath: 'id', autoIncrement: true },
  teams: { keyPath: 'id', autoIncrement: true },
  players: { keyPath: 'id', autoIncrement: true },
  matches: { keyPath: 'id', autoIncrement: true },
  events: { keyPath: 'id', autoIncrement: true },
};

const INDEXES = {
  leagues: [
    { name: 'byName', keyPath: 'name', unique: true },
    { name: 'byActive', keyPath: 'isActive', unique: false },
  ],
  teams: [
    { name: 'byLeague', keyPath: 'leagueId', unique: false },
    { name: 'byName', keyPath: 'name', unique: false },
  ],
  players: [
    { name: 'byTeam', keyPath: 'teamId', unique: false },
    { name: 'byName', keyPath: 'name', unique: false },
  ],
  matches: [
    { name: 'byLeague', keyPath: 'leagueId', unique: false },
    { name: 'byHomeTeam', keyPath: 'homeTeamId', unique: false },
    { name: 'byAwayTeam', keyPath: 'awayTeamId', unique: false },
    { name: 'byDate', keyPath: 'date', unique: false },
    { name: 'byStatus', keyPath: 'status', unique: false },
    { name: 'byRound', keyPath: 'round', unique: false },
  ],
  events: [
    { name: 'byMatch', keyPath: 'matchId', unique: false },
    { name: 'byPlayer', keyPath: 'playerId', unique: false },
  ],
};
