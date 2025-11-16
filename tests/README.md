# Visits Service Tests

## Overview
This directory contains tests for the Visits Service microservice, which has been updated to use MongoDB for all visit data storage.

## Test Files

### Unit Tests
- **visitController.mongo.test.js** - Tests for the MongoDB-based visit controller
- **visitTemplate.test.js** - Tests for visit template CRUD operations
- **mongoRoutes.test.js** - Tests for MongoDB management endpoints (setup, seeding, status)

### Integration Tests
- **integration.test.js** - End-to-end tests that verify the service works correctly with a running MongoDB instance

### Legacy Tests (MySQL-based)
- **visitController.test.js** - Old tests for MySQL/Encounter-based visits (deprecated)
- **encounter.test.js** - Tests for the Encounter model (deprecated)
- **visitTask.test.js** - Tests for visit tasks (deprecated)

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test -- visitTemplate.test.js
```

### Run Integration Tests
Make sure the service is running first:
```bash
# Terminal 1: Start the service
npm start

# Terminal 2: Run integration tests
npm test -- integration.test.js
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

## Test Coverage

### Visit Templates
- ✅ GET /api/visit-templates - Fetch and transform templates
- ✅ POST /api/visit-templates - Create new template
- ✅ PUT /api/visit-templates/:id - Update template
- ✅ DELETE /api/visit-templates/:id - Delete template
- ✅ GET /api/visit-templates/:id/tasks - Get template tasks

### Visits (MongoDB)
- ✅ GET /api/visits - Fetch visits with pagination
- ✅ Filter by status, patient, nurse, date range
- ✅ Error handling

### MongoDB Management
- ✅ POST /api/mongo/setup - Setup collections and indexes
- ✅ POST /api/mongo/seed-types - Seed visit types
- ✅ POST /api/mongo/seed-templates - Seed visit templates
- ✅ POST /api/mongo/seed - Seed visit data
- ✅ GET /api/mongo/status - Check MongoDB status

## Key Changes from Previous Architecture

### Before (MySQL)
- Visits stored in MySQL `visits` table as FHIR Encounters
- Tasks stored in separate `visit_tasks` table
- Complex joins required for visit data

### After (MongoDB)
- All visits stored in MongoDB `visit_data` collection
- Tasks embedded in visit documents
- Visit templates with default tasks
- Regulated vs non-regulated visit classification
- Flexible schema for mobile app data (photos, audio, offline sync)

## Data Structure

### Visit Document
```javascript
{
  patientId: String,
  patientName: String,
  nurseId: String,
  nurseName: String,
  scheduledTime: Date,
  status: 'planned' | 'inProgress' | 'completed' | 'cancelled',
  visitType: String, // Reference to VisitType
  isRegulated: Boolean, // If true, also stored in MySQL as FHIR
  requiresLicense: Boolean,
  taskCompletions: [{
    taskId: String,
    taskTitle: String,
    taskCategory: String,
    completed: Boolean,
    completedAt: Date
  }],
  vitalSigns: { ... },
  photos: [String],
  audioRecordingPath: String,
  syncStatus: 'synced' | 'pending' | 'failed'
}
```

### Visit Template Document
```javascript
{
  name: String,
  displayName: String,
  visitType: String,
  category: 'medical' | 'assessment' | 'therapy' | 'emergency' | 'care' | 'social',
  defaultDuration: Number,
  requiresLicense: Boolean,
  requiredStaffRole: String,
  defaultTasks: [{
    taskTitle: String,
    isRequired: Boolean,
    order: Number
  }]
}
```

## Environment Variables for Testing
```bash
TEST_BASE_URL=http://localhost:3008
MONGODB_URI=mongodb://localhost:27017/nursing_home_visits_test
```

## Notes
- Integration tests require a running MongoDB instance
- Unit tests use mocked models and don't require database connection
- Legacy MySQL-based tests are kept for reference but may not work with current architecture
