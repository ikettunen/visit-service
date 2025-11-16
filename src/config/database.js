require('dotenv').config();
const mysql = require('mysql2/promise');
const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// MySQL connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'nursing_home_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  multipleStatements: true
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Create database if it doesn't exist
async function createDatabase() {
  try {
    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.end();
    
    logger.info(`Database '${dbConfig.database}' created or already exists`);
    return true;
  } catch (error) {
    logger.error('Failed to create database:', error);
    return false;
  }
}

// Test connection function
async function testConnection() {
  try {
    // First try to create database if it doesn't exist
    await createDatabase();
    
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
  createDatabase,
  dbConfig
};