# MongoDB Schemas - Visits Service

This document describes all MongoDB collections and their schemas used by the visits-service.

## Database: `nursing_home_visits`

### Collections Overview
1. **care_plans** - Patient care plans with goals, interventions, and progress tracking
2. **visits** - Visit records (planned and completed)
3. **visit_templates** - Reusable visit templates
4. **visit_types** - Visit type definitions
5. **task_templates** - Reusable task templates
6. **task_categories** - Task category definitions
7. **encounters** - FHIR-compliant encounter records
8. **patient_tasks** - Patient-specific tasks

---

## 1. Care Plans Collection

**Collection Name:** `care_plans`

### Schema

```javascript
{
  _id: ObjectId,
  patientId: String,              // UUID from MySQL patients table
  patientName: String,
  status: String,                 // 'active' | 'completed' | 'cancelled' | 'on_hold'
  startDate: Date,
  endDate: Date,
  
  // Care goals
  goals: [{
    _id: ObjectId,
    description: String,          // Max 500 chars
    targetDate: Date,
    status: String,               // 'not_started' | 'in_progress' | 'achieved' | 'not_achieved'
    measurableOutcome: String,    // Max 300 chars
    progress: Number              // 0-100
  }],
  
  // Scheduled interventions (visits)
  interventions: [{
    _id: ObjectId,
    visitTemplateId: ObjectId,    // Reference to VisitTemplate
    visitType: String,
    frequency: {
      type: String,               // 'daily' | 'weekly' | 'monthly' | 'as_needed'
      times: Number,
      daysOfWeek: [Number],       // 0-6 (Sunday-Saturday)
      daysOfMonth: [Number],      // 1-31
      timeOfDay: [String]         // ["08:00", "14:00"]
    },
    duration: Number,             // Minutes (5-480)
    assignedRole: String,         // 'nurse' | 'doctor' | 'care_assistant' | 'physiotherapist' | 'any'
    additionalTasks: [{
      taskTemplateId: ObjectId,
      taskTitle: String,
      isRequired: Boolean
    }]
  }],
  
  // Conditions being addressed
  conditions: [{
    _id: ObjectId,
    code: String,                 // ICD-10 code
    display: String,
    severity: String,             // 'mild' | 'moderate' | 'severe'
    onsetDate: Date
  }],
  
  // Team members involved
  careTeam: [{
    _id: ObjectId,
    userId: String,
    userName: String,
    role: String,
    isPrimary: Boolean
  }],
  
  // Progress notes
  progressNotes: [{
    _id: ObjectId,
    date: Date,
    author: {
      userId: String,
      userName: String
    },
    note: String,                 // Max 2000 chars
    goalId: ObjectId              // Optional reference to goal
  }],
  
  // Metadata
  createdBy: {
    userId: String,
    userName: String
  },
  lastReviewedDate: Date,
  nextReviewDate: Date,
  notes: String,
  
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes

```javascript
{ patientId: 1, status: 1 }
{ status: 1, endDate: 1 }
{ 'careTeam.userId': 1 }
{ startDate: 1, endDate: 1 }
```

### Virtual Fields

- `daysRemaining` - Calculated days until endDate
- `overallProgress` - Average progress of all goals

### Instance Methods

- `isExpired()` - Check if care plan has expired
- `addProgressNote(note, author, goalId)` - Add a progress note
- `updateGoalProgress(goalId, progress, status)` - Update goal progress

### Static Methods

- `getActive()` - Get all active care plans
- `getByPatient(patientId)` - Get care plans for a patient
- `getExpiringSoon(days)` - Get care plans expiring within N days

---

## 2. Visits Collection

**Collection Name:** `visits`

### Schema

```javascript
{
  _id: ObjectId,
  mysqlVisitId: Number,           // Reference to MySQL visits table
  patientId: String,              // UUID from MySQL
  patientName: String,
  visitType: String,
  visitTemplateId: ObjectId,      // Reference to VisitTemplate
  scheduledTime: Date,
  actualStartTime: Date,
  actualEndTime: Date,
  status: String,                 // 'planned' | 'in_progress' | 'completed' | 'cancelled'
  duration: Number,               // Minutes
  assignedStaffId: String,
  assignedStaffName: String,
  assignedRole: String,
  
  // Tasks for this visit
  tasks: [{
    taskTemplateId: ObjectId,
    title: String,
    description: String,
    category: String,
    isRequired: Boolean,
    completed: Boolean,
    completedAt: Date,
    completedBy: {
      userId: String,
      userName: String
    },
    notes: String
  }],
  
  // Visit notes and observations
  notes: String,
  observations: String,
  
  // Files and recordings
  files: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    uploadedAt: Date,
    uploadedBy: String
  }],
  
  recordings: [{
    filename: String,
    duration: Number,
    recordedAt: Date,
    recordedBy: String
  }],
  
  // Metadata
  generatedFromCarePlan: Boolean,
  carePlanId: ObjectId,
  
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes

```javascript
{ patientId: 1, scheduledTime: -1 }
{ status: 1, scheduledTime: 1 }
{ assignedStaffId: 1, scheduledTime: 1 }
{ mysqlVisitId: 1 }
{ visitTemplateId: 1 }
```

---

## 3. Visit Templates Collection

**Collection Name:** `visit_templates`

### Schema

```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  visitType: String,
  defaultDuration: Number,        // Minutes
  isRegulated: Boolean,           // Requires specific qualifications
  requiredQualifications: [String],
  
  // Default tasks for this template
  defaultTasks: [{
    taskTemplateId: ObjectId,
    isRequired: Boolean,
    order: Number
  }],
  
  // Metadata
  isActive: Boolean,
  createdBy: String,
  
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes

```javascript
{ name: 1 }
{ visitType: 1 }
{ isRegulated: 1 }
{ isActive: 1 }
```

---

## 4. Visit Types Collection

**Collection Name:** `visit_types`

### Schema

```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  category: String,               // 'medical' | 'care' | 'therapy' | 'assessment'
  defaultDuration: Number,
  color: String,                  // Hex color for UI
  icon: String,                   // Icon name
  isActive: Boolean,
  
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes

```javascript
{ name: 1 }
{ category: 1 }
{ isActive: 1 }
```

---

## 5. Task Templates Collection

**Collection Name:** `task_templates`

### Schema

```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  category: String,               // 'medical' | 'care' | 'therapy' | 'assessment' | 'documentation'
  estimatedDuration: Number,      // Minutes
  instructions: String,
  requiredEquipment: [String],
  safetyNotes: String,
  isActive: Boolean,
  
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes

```javascript
{ name: 1 }
{ category: 1 }
{ isActive: 1 }
```

---

## 6. Task Categories Collection

**Collection Name:** `task_categories`

### Schema

```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  color: String,
  icon: String,
  order: Number,
  isActive: Boolean,
  
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes

```javascript
{ name: 1 }
{ order: 1 }
```

---

## 7. Encounters Collection

**Collection Name:** `encounters`

### Schema

```javascript
{
  _id: ObjectId,
  mysqlVisitId: Number,           // Reference to MySQL visits table
  patientId: String,
  status: String,                 // 'planned' | 'arrived' | 'in-progress' | 'finished' | 'cancelled'
  class: String,                  // 'ambulatory' | 'emergency' | 'home' | 'inpatient'
  type: [{
    coding: [{
      system: String,
      code: String,
      display: String
    }],
    text: String
  }],
  
  period: {
    start: Date,
    end: Date
  },
  
  participant: [{
    type: [{
      coding: [{
        system: String,
        code: String,
        display: String
      }]
    }],
    individual: {
      reference: String,
      display: String
    }
  }],
  
  reasonCode: [{
    coding: [{
      system: String,
      code: String,
      display: String
    }],
    text: String
  }],
  
  location: [{
    location: {
      reference: String,
      display: String
    }
  }],
  
  serviceProvider: {
    reference: String,
    display: String
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes

```javascript
{ patientId: 1, 'period.start': -1 }
{ mysqlVisitId: 1 }
{ status: 1 }
```

---

## 8. Patient Tasks Collection

**Collection Name:** `patient_tasks`

### Schema

```javascript
{
  _id: ObjectId,
  patientId: String,
  patientName: String,
  taskTemplateId: ObjectId,
  title: String,
  description: String,
  category: String,
  priority: String,               // 'low' | 'medium' | 'high' | 'urgent'
  status: String,                 // 'pending' | 'in_progress' | 'completed' | 'cancelled'
  
  dueDate: Date,
  completedAt: Date,
  completedBy: {
    userId: String,
    userName: String
  },
  
  assignedTo: {
    userId: String,
    userName: String,
    role: String
  },
  
  notes: String,
  
  // Related entities
  visitId: ObjectId,
  carePlanId: ObjectId,
  
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes

```javascript
{ patientId: 1, status: 1 }
{ 'assignedTo.userId': 1, status: 1 }
{ dueDate: 1, status: 1 }
{ visitId: 1 }
{ carePlanId: 1 }
```

---

## Data Relationships

### MySQL ↔ MongoDB Relationships

```
MySQL patients.id (UUID)
    ↓
MongoDB care_plans.patientId
MongoDB visits.patientId
MongoDB patient_tasks.patientId
MongoDB encounters.patientId

MySQL visits.id (INT)
    ↓
MongoDB visits.mysqlVisitId
MongoDB encounters.mysqlVisitId

MySQL staff.id (VARCHAR)
    ↓
MongoDB care_plans.careTeam.userId
MongoDB visits.assignedStaffId
MongoDB patient_tasks.assignedTo.userId
```

### MongoDB Internal Relationships

```
visit_templates._id
    ↓
care_plans.interventions.visitTemplateId
visits.visitTemplateId

task_templates._id
    ↓
care_plans.interventions.additionalTasks.taskTemplateId
visits.tasks.taskTemplateId
patient_tasks.taskTemplateId

care_plans._id
    ↓
visits.carePlanId
patient_tasks.carePlanId

care_plans.goals._id
    ↓
care_plans.progressNotes.goalId
```

---

## Migration Notes

### From MySQL to MongoDB

The visits-service uses a hybrid approach:
- **MySQL**: Core patient data, staff data, basic visit records
- **MongoDB**: Flexible visit data, care plans, tasks, files, recordings

This allows:
- FHIR compliance through MySQL structured data
- Flexibility for complex nested data in MongoDB
- Easy integration with existing systems

### Seeding Data

1. **MySQL First**: Run FHIR backend seed script
2. **MongoDB Second**: Run visits-service seed scripts
   - `seedVisitTypes.js`
   - `seedVisitTemplates.js`
   - `seed-care-plans.js`

---

## Backup and Restore

### Backup MongoDB

```bash
mongodump --db nursing_home_visits --out ./backup
```

### Restore MongoDB

```bash
mongorestore --db nursing_home_visits ./backup/nursing_home_visits
```

### Export Collection to JSON

```bash
mongoexport --db nursing_home_visits --collection care_plans --out care_plans.json --pretty
```

### Import Collection from JSON

```bash
mongoimport --db nursing_home_visits --collection care_plans --file care_plans.json
```

---

**Last Updated:** November 29, 2025
**Version:** 1.0.0
