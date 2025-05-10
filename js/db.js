const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db.sqlite');

// Create users table if it doesn't exist
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            username TEXT NOT NULL,
            password TEXT NOT NULL,
            status TEXT DEFAULT 'offline',
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            lastLogin TIMESTAMP
        );
    `);
});

module.exports = db;
