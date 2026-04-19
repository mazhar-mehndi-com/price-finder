const mysql = require('mysql2/promise');

// This connection pool will be used for both the Next.js API routes 
// and the standalone background worker.
let pool;

export const getDB = () => {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL is missing in .env. Please provide a valid MySQL connection string.');
    }

    pool = mysql.createPool({
      uri: connectionString,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: {
        rejectUnauthorized: true // Required for most cloud DBs like TiDB or Aiven
      }
    });
  }
  return pool;
};
