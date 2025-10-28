// Test setup file
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Mock environment variables for testing
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3306';
process.env.DB_NAME = 'nursing_home_test';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.MONGODB_URI = 'mongodb://localhost:27017/nursing_home_test';
process.env.PORT = '3007';
process.env.JWT_SECRET = 'test-secret-key';

// Global test timeout
jest.setTimeout(10000);
