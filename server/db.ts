import Database from 'better-sqlite3'
import path from 'path'

const db = new Database(path.join(process.cwd(), 'traders.db'))

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    address TEXT PRIMARY KEY,
    cash REAL NOT NULL,
    high_score REAL NOT NULL,
    rank TEXT DEFAULT 'Unranked',
    submitted_cash REAL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS positions (
    id TEXT PRIMARY KEY,
    player_address TEXT NOT NULL,
    type TEXT NOT NULL,
    entry_price REAL NOT NULL,
    leverage INTEGER NOT NULL,
    size REAL NOT NULL,
    collateral REAL NOT NULL,
    opened_at INTEGER NOT NULL,
    closed_at INTEGER,
    close_price REAL,
    pnl REAL,
    is_liquidated BOOLEAN DEFAULT 0,
    FOREIGN KEY (player_address) REFERENCES players(address)
  );

  CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    price REAL NOT NULL,
    timestamp INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_positions_player ON positions(player_address);
  CREATE INDEX IF NOT EXISTS idx_positions_open ON positions(closed_at) WHERE closed_at IS NULL;
  CREATE INDEX IF NOT EXISTS idx_price_timestamp ON price_history(timestamp);
`)

// Migrate existing players table to add new columns if they don't exist
try {
  db.exec(`
    ALTER TABLE players ADD COLUMN rank TEXT DEFAULT 'Unranked';
  `)
  console.log('✅ Added rank column to players table')
} catch (e: any) {
  if (!e.message.includes('duplicate column')) {
    console.log('ℹ️  Rank column already exists')
  }
}

try {
  db.exec(`
    ALTER TABLE players ADD COLUMN submitted_cash REAL DEFAULT 0;
  `)
  console.log('✅ Added submitted_cash column to players table')
} catch (e: any) {
  if (!e.message.includes('duplicate column')) {
    console.log('ℹ️  Submitted_cash column already exists')
  }
}

export default db
