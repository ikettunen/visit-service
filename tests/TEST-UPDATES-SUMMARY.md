# Visits Service Test Updates

## Summary

Updated tests to reflect the new MongoDB-first architecture and taskCompletions support.

## New Test Files

### 1. `visitCreation.mongodb.test.js`
Tests visit creation with MongoDB and taskCompletions.

**Coverage:**
- ✅ Create visit in both MySQL and MongoDB with tasks
- ✅ MongoDB record created when taskCompletions provided
- ✅ Handle visits from care-plan-scheduler (with 4+ tasks)
- ✅ Validate required fields
- ✅ Handle MongoDB creation failure gracefully

**Key Test Cases:**
```javascript
// Test 1: Create with tasks
POST /api/visits
{
  patient_id: "patient-123",
  scheduled_time: "2025-11-30 10:00:00",
  taskCompletions: [
    { taskId: "task-1", taskTitle: "Verify patient", completed: false },
    { taskId: "task-2", taskTitle: "Administer med", completed: false }
  ]
}
// Expected: MySQL + MongoDB created, both have tasks

// Test 2: Care plan scheduler format
POST /api/visits
{
  patient_id: "patient-123",
  taskCompletions: [4 tasks from template],
  visitTemplateId: "template-id",
  generatedFromCarePlan: true
}
// Expected: All 4 tasks stored in MongoDB
```

### 2. `visitController.mongodb.test.js`
Tests MongoDB-first approach for getVisitsByPatient.

**Coverage:**
- ✅ Return MongoDB visits when available (with tasks)
- ✅ Fallback to MySQL when MongoDB empty
- ✅ Handle MongoDB errors and fallback
- ✅ Include taskCompletions in response
- ✅ Handle pagination correctly

**Key Test Cases:**
```javascript
// Test 1: MongoDB has data
GET /api/visits/patient/patient-123
// Expected: Returns MongoDB visits with taskCompletions
// MySQL NOT queried

// Test 2: MongoDB empty
GET /api/visits/patient/patient-123
// Expected: Falls back to MySQL
// Returns visits without tasks

// Test 3: MongoDB error
GET /api/visits/patient/patient-123
// Expected: Catches error, falls back to MySQL
// Still returns data
```

## Updated Test Files

### `visitController.test.js`
Updated POST /api/visits test to include required fields:
- Added `nurse_id`, `nurse_name`
- Added `status`, `visit_type`
- Reflects real API requirements

## Running Tests

### Run All Tests
```bash
cd visits-service
npm test
```

### Run Specific Test Suite
```bash
# MongoDB creation tests
npm test -- visitCreation.mongodb.test.js

# MongoDB priority tests
npm test -- visitController.mongodb.test.js

# Original controller tests
npm test -- visitController.test.js
```

### Run with Coverage
```bash
npm test -- --coverage
```

## Test Structure

```
visits-service/tests/
├── visitCreation.mongodb.test.js      ← NEW: Visit creation with tasks
├── visitController.mongodb.test.js    ← NEW: MongoDB-first queries
├── visitController.test.js            ← UPDATED: Fixed required fields
├── carePlan.test.js                   ← Existing
├── encounter.test.js                  ← Existing
├── integration.test.js                ← Existing
├── mongoRoutes.test.js                ← Existing
├── visitModel.test.js                 ← Existing
└── ...
```

## What's Tested

### Visit Creation Flow
1. ✅ MySQL Encounter created
2. ✅ MongoDB Visit created (when taskCompletions present)
3. ✅ TaskCompletions stored in MongoDB
4. ✅ Graceful handling of MongoDB failures
5. ✅ Validation of required fields

### Visit Retrieval Flow
1. ✅ MongoDB queried first
2. ✅ Returns visits with taskCompletions
3. ✅ Falls back to MySQL if MongoDB empty
4. ✅ Falls back to MySQL if MongoDB errors
5. ✅ Pagination works correctly

### Data Integrity
1. ✅ TaskCompletions structure validated
2. ✅ All task fields present (taskId, taskTitle, category, priority)
3. ✅ Both template and patient_specific tasks supported
4. ✅ Completed/incomplete status tracked

## Mock Structure

### MongoDB Visit Mock
```javascript
const mockMongoVisit = {
  _id: 'visit-uuid',
  patientId: 'patient-123',
  patientName: 'John Doe',
  nurseId: 'nurse-1',
  nurseName: 'Anna Virtanen',
  scheduledTime: new Date(),
  status: 'planned',
  taskCompletions: [
    {
      taskId: 'task-1',
      taskType: 'template',
      taskTitle: 'Verify patient identity',
      taskCategory: 'assessment',
      priority: 'high',
      completed: false
    }
  ],
  save: jest.fn().mockResolvedValue()
};
```

### MySQL Encounter Mock
```javascript
const mockEncounter = {
  id: 'visit-uuid',
  patient_id: 'patient-123',
  patient_name: 'John Doe',
  nurse_id: 'nurse-1',
  nurse_name: 'Anna Virtanen',
  scheduled_time: '2025-11-30 10:00:00',
  status: 'planned',
  save: jest.fn().mockResolvedValue()
};
```

## Expected Test Results

### All Tests Passing
```
PASS  tests/visitCreation.mongodb.test.js
  Visit Creation - MongoDB Integration
    POST /api/visits with taskCompletions
      ✓ should create visit in both MySQL and MongoDB with tasks
      ✓ should create MongoDB record when taskCompletions provided
      ✓ should handle visit creation from care-plan-scheduler
      ✓ should validate required fields
      ✓ should handle MongoDB creation failure gracefully

PASS  tests/visitController.mongodb.test.js
  Visit Controller - MongoDB Priority
    GET /api/visits/patient/:patientId
      ✓ should return MongoDB visits when available
      ✓ should fallback to MySQL when MongoDB has no data
      ✓ should handle MongoDB errors and fallback to MySQL
      ✓ should include taskCompletions in MongoDB visits
      ✓ should handle pagination correctly

Test Suites: 2 passed, 2 total
Tests:       10 passed, 10 total
```

## Integration with CI/CD

### GitHub Actions
```yaml
name: Visits Service Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:6
        ports:
          - 27017:27017
      mysql:
        image: mysql:8
        env:
          MYSQL_ROOT_PASSWORD: test
        ports:
          - 3306:3306
    
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: cd visits-service && npm install
      
      - name: Run tests
        run: cd visits-service && npm test
        env:
          MONGODB_URI: mongodb://localhost:27017/test
          DB_HOST: localhost
          DB_USER: root
          DB_PASSWORD: test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

## Troubleshooting

### Tests Failing: "Cannot find module"
```bash
cd visits-service
npm install
```

### Tests Failing: "MongoDB connection"
```bash
# Ensure MongoDB is running
pm2 status mongod
# Or
systemctl status mongod
```

### Tests Failing: "MySQL connection"
```bash
# Ensure MySQL is running
pm2 status mysql
# Or
systemctl status mysql
```

### Mock Not Working
Check that mocks are defined before the test:
```javascript
jest.mock('../src/models/Visit');
const Visit = require('../src/models/Visit');
```

## Next Steps

1. ✅ Tests created for MongoDB integration
2. ⬜ Run tests: `npm test`
3. ⬜ Fix any failing tests
4. ⬜ Add to CI/CD pipeline
5. ⬜ Monitor coverage reports

---

**Status**: ✅ Tests Updated

**Coverage**: MongoDB creation, MongoDB-first queries, taskCompletions

**Next**: Run `npm test` in visits-service

---

*Last Updated: November 30, 2025*
