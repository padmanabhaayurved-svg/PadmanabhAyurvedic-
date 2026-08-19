const { createClient } = require('@libsql/client');

// Initialize the Turso libSQL client
// If the environment variables aren't set, fallback to a local SQLite file for development.
const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

module.exports = { client };
