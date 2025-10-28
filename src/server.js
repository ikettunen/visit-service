const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const pino = require('pino');
const expressPino = require('express-pino-logger');
const mongoose = require('mongoose');
const { testConnection } = require('./config/database');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
require('dotenv').config();

// Import routes
const visitRoutes = require('./routes/visitRoutes');
const taskCompletionRoutes = require('./routes/taskCompletionRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

// Initialize logger
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const expressLogger = expressPino({ logger });

// Initialize express app
const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(bodyParser.json({ limit: '50mb' })); // Parse JSON bodies with larger limit for images
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(expressLogger); // Request logging

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Visits Service API Documentation'
}));

// Connect to MongoDB (for flexible visit data, files, and recordings)
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nursing_home')
  .then(() => {
    logger.info('Connected to MongoDB successfully');
  })
  .catch((err) => {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Test MySQL connection
testConnection()
  .then(() => {
    logger.info('MySQL connection test successful');
  })
  .catch((err) => {
    logger.error('MySQL connection error:', err);
    process.exit(1);
  });

// Database connections are handled by models via config/database.js

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'visits-service' });
});

// Routes
app.use('/api/visits', visitRoutes);
app.use('/api/task-completions', taskCompletionRoutes);
app.use('/api/uploads', uploadRoutes);

// Error handler middleware
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// Start server
const port = process.env.PORT || 3007;
app.listen(port, () => {
  logger.info(`Visits service listening at http://localhost:${port}`);
  logger.info(`API documentation available at http://localhost:${port}/api-docs`);
});

module.exports = app; // For testing