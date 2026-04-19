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

    // Defensive config for cloud environments
    const config = {
      uri: connectionString,
      waitForConnections: true,
      connectionLimit: 5, // Lower limit is safer for serverless/cloud
      queueLimit: 0,
    };

    // Only add SSL object if not already present in the connection string URL
    if (!connectionString.includes('ssl=')) {
        config.ssl = {
            rejectUnauthorized: true 
        };
    }

    pool = mysql.createPool(config);
  }
  return pool;
};
