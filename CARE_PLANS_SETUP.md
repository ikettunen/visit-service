# Care Plans Setup Guide

## What's Been Added

### 1. CarePlan MongoDB Model
**Location:** `src/models/CarePlan.js`

**Features:**
- Patient care goals with progress tracking
- Scheduled interventions (visits) with flexible frequency
- Conditions being addressed
- Care team members
- Progress notes
- Automatic status updates

### 2. Seed Data Script
**Location:** `scripts/seed-care-plans.js`

**Includes 3 sample care plans for:**
1. **Tapio Järvinen** - Mobility improvement & blood pressure management
2. **Eino Mäkinen** - Cognitive function & nutrition
3. **Tapio Järvinen** (second patient) - Diabetes management & foot care

### 3. API Endpoint
**Endpoint:** `POST /api/mongo/seed-care-plans`

Added to `src/routes/mongoRoutes.js`

## How to Use

### Option 1: Run Seed Script Directly

```bash
cd visits-service
node scripts/seed-care-plans.js
```

### Option 2: Use API Endpoint

```bash
curl -X POST http://localhost:3008/api/mongo/seed-care-plans
```

### Option 3: From Admin Page (if available)

Add a button in your admin interface that calls:
```javascript
fetch('/api/mongo/seed-care-plans', { method: 'POST' })
```

## Care Plan Structure

```javascript
{
  patientId: String,
  patientName: String,
  status: 'active' | 'completed' | 'cancelled' | 'on_hold',
  startDate: Date,
  endDate: Date,
  
  goals: [{
    description: String,
    targetDate: Date,
    status: 'not_started' | 'in_progress' | 'achieved' | 'not_achieved',
    measurableOutcome: String,
    progress: Number (0-100)
  }],
  
  interventions: [{
    visitType: String,
    frequency: {
      type: 'daily' | 'weekly' | 'monthly' | 'as_needed',
      times: Number,
      daysOfWeek: [Number],  // 0-6
      daysOfMonth: [Number], // 1-31
      timeOfDay: [String]    // ["08:00", "14:00"]
    },
    duration: Number,
    assignedRole: String,
    additionalTasks: [...]
  }],
  
  conditions: [{
    code: String,
    display: String,
    severity: 'mild' | 'moderate' | 'severe',
    onsetDate: Date
  }],
  
  careTeam: [{
    userId: String,
    userName: String,
    role: String,
    isPrimary: Boolean
  }],
  
  progressNotes: [{
    date: Date,
    author: { userId, userName },
    note: String,
    goalId: ObjectId
  }]
}
```

## Next Steps

### 1. Add Care Plan CRUD Endpoints

Create `src/controllers/carePlanController.js`:
```javascript
POST   /api/care-plans           - Create care plan
GET    /api/care-plans/:id       - Get care plan
PUT    /api/care-plans/:id       - Update care plan
DELETE /api/care-plans/:id       - Delete care plan
GET    /api/care-plans/patient/:patientId - Get patient's care plans
POST   /api/care-plans/:id/goals/:goalId/progress - Update goal progress
POST   /api/care-plans/:id/notes - Add progress note
```

### 2. Connect to Lambda Scheduler

The care-plan-manager Lambda function will:
- Run daily via EventBridge
- Fetch active care plans via API
- Generate visits based on interventions
- Create visits via visits-service API

### 3. Frontend Integration

Add to health-staff-dashboard:
- Care plan list view
- Care plan detail view
- Goal progress tracking
- Progress notes interface
- Care team management

### 4. Admin Page Button

Add to your admin page:

```html
<button onclick="seedCarePlans()">Seed Care Plans</button>

<script>
async function seedCarePlans() {
  try {
    const response = await fetch('/api/mongo/seed-care-plans', {
      method: 'POST'
    });
    const data = await response.json();
    alert(data.message);
  } catch (error) {
    alert('Error seeding care plans: ' + error.message);
  }
}
</script>
```

## Testing

### Verify Care Plans Were Created

```bash
# Connect to MongoDB
mongosh nursing_home_visits

# Count care plans
db.care_plans.countDocuments()

# View all care plans
db.care_plans.find().pretty()

# Find active care plans
db.care_plans.find({ status: 'active' }).pretty()

# Find care plans for specific patient
db.care_plans.find({ patientId: '46337ea2-3ada-4dad-a52d-6848cf24d6fb' }).pretty()
```

### Test API Endpoint

```bash
# Seed care plans
curl -X POST http://localhost:3008/api/mongo/seed-care-plans

# Expected response:
{
  "success": true,
  "message": "Care plans seeding completed. 3 care plans created.",
  "data": { "total": 3 },
  "timestamp": "2025-11-18T..."
}
```

## Sample Care Plan Data

### Example: Mobility & Blood Pressure Management

```javascript
{
  patientName: "Tapio Järvinen",
  goals: [
    "Improve mobility and reduce fall risk (45% progress)",
    "Maintain stable blood pressure (70% progress)"
  ],
  interventions: [
    "Morning Care - Daily at 08:00",
    "Medication Round - 3x daily (08:00, 14:00, 20:00)",
    "Physical Therapy - Mon/Wed/Fri at 10:00"
  ],
  conditions: [
    "Essential hypertension (moderate)",
    "Muscle weakness (moderate)"
  ],
  careTeam: [
    "Anna Virtanen (Primary Nurse)",
    "Dr. Korhonen (Physician)"
  ]
}
```

## MongoDB Collection

- **Collection Name:** `care_plans`
- **Indexes:**
  - `patientId + status`
  - `status + endDate`
  - `careTeam.userId`
  - `startDate + endDate`

## Model Methods

```javascript
// Instance methods
carePlan.isExpired()
carePlan.addProgressNote(note, author, goalId)
carePlan.updateGoalProgress(goalId, progress, status)

// Static methods
CarePlan.getActive()
CarePlan.getByPatient(patientId)
CarePlan.getExpiringSoon(days)

// Virtuals
carePlan.daysRemaining
carePlan.overallProgress
```
