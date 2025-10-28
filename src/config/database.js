const mysql = require('mysql2/promise');
const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// MySQL connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'nursing_home',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  // Remove timeout as it's not a valid mysql2 option
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test connection function
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    logger.info('MySQL connection test successful');
    connection.release();
    return true;
  } catch (error) {
    logger.error('MySQL connection test failed:', error);
    return false;
  }
}

// Execute query with error handling
async function executeQuery(query, params = []) {
  try {
    const [rows] = await pool.execute(query, params);
    return rows;
  } catch (error) {
    logger.error('Database query error:', { query, params, error: error.message });
    throw error;
  }
}

// Execute transaction
async function executeTransaction(queries) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const results = [];
    for (const { query, params } of queries) {
      const [result] = await connection.execute(query, params);
      results.push(result);
    }
    
    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    logger.error('Transaction error:', error);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  testConnection,
  executeQuery,
  executeTransaction,
  dbConfig
};