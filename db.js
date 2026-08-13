const postgres = require('postgres');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("❌ DATABASE_URL missing in .env file");
}

const sql = postgres(connectionString);

module.exports = sql;
