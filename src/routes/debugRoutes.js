const express = require('express');
const { executeQuery } = require('../config/database');
const pino = require('pino');

const router = express.Router();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

/**
 * @route GET /api/debug/health
 * @desc Simple health check without database
 * @access Public
 */
router.get('/health', (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Visits service debug endpoint is working',
      service: 'visits-service',
      timestamp: new Date().toISOString(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        DB_HOST: process.env.DB_HOST,
        DB_PORT: process.env.DB_PORT,
        DB_NAME: process.env.DB_NAME,
        DB_USER: process.env.DB_USER,
        DB_PASSWORD: process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-3) : 'undefined'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/debug/db-status
 * @desc Check database connection and visit data
 * @access Public (for debugging)
 */
router.get('/db-status', async (req, res) => {
  try {
    logger.info('Database status check requested');
    
    const result = {
      success: false,
      data: {
        connection: 'FAILED',
        connectionError: null,
        database: process.env.DB_NAME || 'nursing_home_db',
        databaseExists: false,
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        visitsTableExists: false,
        visitCount: 0,
        sampleVisits: []
      },
      timestamp: new Date().toISOString()
    };
    
    // Simple connection test
    try {
      const mysql = require('mysql2/promise');
      
      // Test server connection first
      const testConnection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'password'
      });
      
      result.data.connection = 'SERVER_OK';
      
      // Check if database exists
      const [databases] = await testConnection.query('SHOW DATABASES');
      const dbName = process.env.DB_NAME || 'nursing_home_db';
      const databaseExists = databases.some(db => Object.values(db)[0] === dbName);
      result.data.databaseExists = databaseExists;
      
      await testConnection.end();
      
      if (databaseExists) {
        result.data.connection = 'OK';
        result.success = true;
        
        // Try to check visits table and show all tables
        try {
          // Show current database and all tables using executeQuery
          const currentDb = await executeQuery('SELECT DATABASE() as current_db');
          result.data.currentDatabase = currentDb[0].current_db;
          
          const allTables = await executeQuery('SHOW TABLES');
          result.data.allTables = allTables.map(row => Object.values(row)[0]);
          
          const tableCheck = await executeQuery(`
            SELECT COUNT(*) as table_exists 
            FROM information_schema.tables 
            WHERE table_schema = ? AND table_name = 'visits'
          `, [dbName]);
          
          result.data.visitsTableExists = tableCheck[0].table_exists > 0;
          
          if (result.data.visitsTableExists) {
            const countResult = await executeQuery('SELECT COUNT(*) as count FROM visits');
            result.data.visitCount = countResult[0].count;
          }
        } catch (tableError) {
          result.data.connectionError = `Table check failed: ${tableError.message}`;
        }
      } else {
        result.data.connectionError = `Database '${dbName}' does not exist`;
      }
      
    } catch (error) {
      result.data.connectionError = error.message;
      logger.error('Database connection failed:', error);
    }
    
    res.status(200).json(result);
    
  } catch (error) {
    logger.error('Database status check failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/debug/test-visits-route
 * @desc Test the visits route directly
 * @access Public (for debugging)
 */
router.get('/test-visits-route/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // Simple query to get visits for patient
    const visits = await executeQuery(
      'SELECT * FROM visits WHERE patient_id = ? ORDER BY scheduled_time DESC LIMIT 10',
      [patientId]
    );
    
    res.status(200).json({
      success: true,
      data: visits,
      count: visits.length,
      patientId: patientId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Test visits route failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route POST /api/debug/create-visits-table
 * @desc Create the visits table if it doesn't exist
 * @access Public (for debugging)
 */
router.post('/create-visits-table', async (req, res) => {
  try {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS visits (
        id VARCHAR(50) PRIMARY KEY,
        patient_id VARCHAR(50) NOT NULL,
        patient_name VARCHAR(200),
        nurse_id VARCHAR(50),
        nurse_name VARCHAR(200),
        scheduled_time TIMESTAMP NOT NULL,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        status VARCHAR(50) NOT NULL DEFAULT 'planned',
        location VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_patient_id (patient_id),
        INDEX idx_scheduled_time (scheduled_time),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await executeQuery(createTableSQL);
    
    // Verify table was created
    const tableCheck = await executeQuery(`
      SELECT COUNT(*) as table_exists 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'visits'
    `, [process.env.DB_NAME || 'nursing_home_db']);
    
    res.status(200).json({
      success: true,
      message: 'Visits table created successfully',
      data: {
        tableExists: tableCheck[0].table_exists > 0
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Failed to create visits table:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route POST /api/debug/seed-visits
 * @desc Create some sample visit data for testing
 * @access Public (for debugging)
 */
router.post('/seed-visits', async (req, res) => {
  try {
    const { v4: uuidv4 } = require('uuid');
    
    // Sample visit data
    const sampleVisits = [
      {
        id: uuidv4(),
        patient_id: '338db3fc-a7cb-468b-a998-90c0c3a700ce', // Aino Korhonen
        patient_name: 'Aino Korhonen',
        nurse_id: 'S0001',
        nurse_name: 'Anna Virtanen',
        scheduled_time: new Date('2025-10-28T10:00:00Z'),
        start_time: new Date('2025-10-28T10:05:00Z'),
        end_time: new Date('2025-10-28T10:30:00Z'),
        status: 'finished',
        location: 'Room 102',
        notes: 'Regular morning visit completed successfully'
      },
      {
        id: uuidv4(),
        patient_id: '338db3fc-a7cb-468b-a998-90c0c3a700ce', // Aino Korhonen
        patient_name: 'Aino Korhonen',
        nurse_id: 'S0001',
        nurse_name: 'Anna Virtanen',
        scheduled_time: new Date('2025-10-28T14:00:00Z'),
        status: 'planned',
        location: 'Room 102',
        notes: 'Afternoon visit scheduled'
      },
      {
        id: uuidv4(),
        patient_id: 'c0c7d88d-5548-4bb7-addd-87e8062f08c1', // Matti Virtanen
        patient_name: 'Matti Virtanen',
        nurse_id: 'S0001',
        nurse_name: 'Anna Virtanen',
        scheduled_time: new Date('2025-10-27T16:00:00Z'),
        start_time: new Date('2025-10-27T16:00:00Z'),
        status: 'in-progress',
        location: 'Room 101',
        notes: 'Evening visit in progress'
      }
    ];
    
    // Insert visits
    for (const visit of sampleVisits) {
      await executeQuery(`
        INSERT INTO visits (
          id, patient_id, patient_name, nurse_id, nurse_name,
          scheduled_time, start_time, end_time, status, location, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        visit.id, visit.patient_id, visit.patient_name,
        visit.nurse_id, visit.nurse_name, visit.scheduled_time,
        visit.start_time, visit.end_time, visit.status,
        visit.location, visit.notes
      ]);
    }
    
    // Get final count
    const countResult = await executeQuery('SELECT COUNT(*) as count FROM visits');
    
    res.status(200).json({
      success: true,
      message: `Created ${sampleVisits.length} sample visits`,
      data: {
        visitsCreated: sampleVisits.length,
        totalVisits: countResult[0].count
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Visit seeding failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;