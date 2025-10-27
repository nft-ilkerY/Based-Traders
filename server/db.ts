import Database from 'better-sqlite3'
import path from 'path'

const db = new Database(path.join(process.cwd(), 'traders.db'))

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    farcaster_username TEXT PRIMARY KEY,
    farcaster_fid INTEGER NOT NULL,
    display_name TEXT,
    pfp_url TEXT,
    cash REAL NOT NULL,
    high_score REAL NOT NULL,
    rank TEXT DEFAULT 'Unranked',
    submitted_cash REAL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS positions (
    id TEXT PRIMARY KEY,
    player_username TEXT NOT NULL,
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
    FOREIGN KEY (player_username) REFERENCES players(farcaster_username)
  );

  CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    price REAL NOT NULL,
    timestamp INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_positions_player ON positions(player_username);
  CREATE INDEX IF NOT EXISTS idx_positions_open ON positions(closed_at) WHERE closed_at IS NULL;
  CREATE INDEX IF NOT EXISTS idx_price_timestamp ON price_history(timestamp);
`)

// Migrate existing players table to add Farcaster columns if they don't exist
try {
  db.exec(`
    ALTER TABLE players ADD COLUMN farcaster_fid INTEGER;
  `)
  console.log('✅ Added farcaster_fid column to players table')
} catch (e: any) {
  if (!e.message.includes('duplicate column')) {
    console.log('ℹ️  Farcaster_fid column already exists')
  }
}

try {
  db.exec(`
    ALTER TABLE players ADD COLUMN farcaster_username TEXT;
  `)
  console.log('✅ Added farcaster_username column to players table')
} catch (e: any) {
  if (!e.message.includes('duplicate column')) {
    console.log('ℹ️  Farcaster_username column already exists')
  }
}

try {
  db.exec(`
    ALTER TABLE players ADD COLUMN display_name TEXT;
  `)
  console.log('✅ Added display_name column to players table')
} catch (e: any) {
  if (!e.message.includes('duplicate column')) {
    console.log('ℹ️  Display_name column already exists')
  }
}

try {
  db.exec(`
    ALTER TABLE players ADD COLUMN pfp_url TEXT;
  `)
  console.log('✅ Added pfp_url column to players table')
} catch (e: any) {
  if (!e.message.includes('duplicate column')) {
    console.log('ℹ️  Pfp_url column already exists')
  }
}

export default db
