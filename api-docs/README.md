# Visits Service API Documentation

## Overview
The Visits Service manages patient visits, including scheduling, task completion, notes, and media attachments.

## Base URL
- Development: `http://localhost:3008/api`
- Production: `http://51.20.164.143:3008/api`

## Authentication
All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

## Endpoints

### Visit Management

#### GET /visits
Get all visits with pagination and filtering.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 50)
- `status` (string): Filter by status (planned, inProgress, completed, cancelled)
- `patient_id` (string): Filter by patient ID
- `nurse_id` (string): Filter by nurse ID
- `visit_type` (string): Filter by visit type
- `date_from` (string): Start date filter (ISO format)
- `date_to` (string): End date filter (ISO format)
- `date` (string): Special filter - use "today" for today's visits

#### GET /visits/:id
Get a specific visit by ID.

#### GET /visits/patient/:patientId
Get all visits for a specific patient.

#### GET /visits/patient/:patientId/with-tasks
Get all visits for a specific patient including task completions (MongoDB data).

#### GET /visits/nurse/:nurseId/active
Get active (non-completed) visits for a specific nurse.

**Query Parameters:**
- `date_from` (string): Start date filter
- `date_to` (string): End date filter

#### POST /visits
Create a new visit.

**Request Body:**
```json
{
  "patient_id": "string (required)",
  "patient_name": "string (required)",
  "nurse_id": "string",
  "nurse_name": "string",
  "scheduled_time": "string (ISO datetime, required)",
  "visit_type": "string",
  "location": "string",
  "notes": "string",
  "taskCompletions": [
    {
      "taskId": "string",
      "taskType": "template|patient_specific",
      "taskTitle": "string",
      "taskCategory": "string",
      "priority": "low|medium|high|critical",
      "completed": false
    }
  ],
  "vitalSigns": {
    "temperature": "number",
    "heartRate": "number",
    "respiratoryRate": "number",
    "systolicBP": "number",
    "diastolicBP": "number",
    "oxygenSaturation": "number"
  }
}
```

#### PUT /visits/:id
Update a visit.

#### PUT /visits/:id/start
Start a visit (set status to inProgress).

#### PUT /visits/:id/complete
Complete a visit (set status to completed).

#### PUT /visits/:id/cancel
Cancel a visit (set status to cancelled).

#### PUT /visits/:id/status
Change visit status with validation.

**Request Body:**
```json
{
  "status": "string (required) - planned|inProgress|awaitingDocumentation|completed|cancelled",
  "staffId": "string (optional) - ID of staff member making the change",
  "staffName": "string (optional) - Name of staff member"
}
```

**Response:**
```json
{
  "message": "Visit status changed to 'awaitingDocumentation' successfully",
  "data": "object - Complete visit data"
}
```

**Validation Rules:**
- Cannot complete visit if required tasks (high/critical priority) are not completed
- Status changes are logged as system notes
- Automatically sets startTime when changing to 'inProgress'
- Automatically sets endTime when changing to 'completed'

#### PUT /visits/:id/tasks/:taskId/complete
Mark a specific task as completed.

**Request Body:**
```json
{
  "staffId": "string (required) - ID of staff member completing task",
  "staffName": "string (optional) - Name of staff member",
  "notes": "string (optional) - Additional notes about task completion"
}
```

**Response:**
```json
{
  "message": "Task 'Administer morning medications' marked as completed",
  "data": {
    "visitId": "string",
    "taskId": "string", 
    "taskTitle": "string",
    "completedBy": {
      "userId": "string",
      "userName": "string"
    },
    "completedAt": "datetime",
    "allRequiredTasksCompleted": "boolean",
    "visit": "object - Complete visit data"
  }
}
```

#### PUT /visits/:id/tasks/:taskId/uncomplete
Mark a specific task as not completed.

**Request Body:**
```json
{
  "staffId": "string (required) - ID of staff member making the change",
  "staffName": "string (optional) - Name of staff member", 
  "reason": "string (optional) - Reason for uncompleting the task"
}
```

#### POST /visits/:id/notes
Add a note to a visit.

**Request Body:**
```json
{
  "noteText": "string (required) - The note content",
  "staffId": "string (required) - ID of staff member adding note",
  "staffName": "string (optional) - Name of staff member",
  "noteType": "string (optional) - Type of note (default: 'general')"
}
```

**Response:**
```json
{
  "message": "Note added to visit successfully",
  "data": {
    "visitId": "string",
    "noteAdded": "string - The formatted note entry",
    "totalNotes": "string - All notes for the visit",
    "visit": "object - Complete visit data"
  }
}
```

**Note Format:**
Notes are automatically formatted with timestamp and staff information:
```
[2025-12-03T14:30:25.000Z] John Doe (general): Patient seems comfortable today and responded well to medication.
```

#### DELETE /visits/:id
Delete a visit.

### Specialized Endpoints

#### GET /visits/medications
Get medication administration visits for today or specific date.

**Query Parameters:**
- `date` (string): Date filter (default: "today", or ISO date string)
- `status` (string): Status filter
- `nurse_id` (string): Nurse filter

#### GET /visits/today
Get visits scheduled for today.

#### POST /visits/sync
Sync visits from mobile devices.

**Request Body:**
```json
{
  "deviceId": "string",
  "visits": [
    {
      "offlineId": "string",
      "patient_id": "string",
      "scheduled_time": "string",
      "taskCompletions": [],
      "vitalSigns": {},
      "photos": []
    }
  ]
}
```

## Data Models

### Visit Structure
```json
{
  "_id": "string",
  "patientId": "string",
  "patientName": "string", 
  "nurseId": "string",
  "nurseName": "string",
  "scheduledTime": "datetime",
  "startTime": "datetime",
  "endTime": "datetime",
  "status": "planned|inProgress|awaitingDocumentation|completed|cancelled",
  "location": "string",
  "visitType": "string",
  "notes": "string",
  "taskCompletions": [
    {
      "taskId": "string",
      "taskType": "template|patient_specific",
      "taskTitle": "string",
      "taskCategory": "string",
      "priority": "low|medium|high|critical",
      "completed": "boolean",
      "completedAt": "datetime",
      "completedBy": {
        "userId": "string",
        "userName": "string"
      },
      "notes": "string"
    }
  ],
  "vitalSigns": {
    "temperature": "number",
    "heartRate": "number",
    "respiratoryRate": "number",
    "systolicBP": "number", 
    "diastolicBP": "number",
    "oxygenSaturation": "number",
    "notes": "string"
  },
  "photos": ["string"],
  "audioRecordingPath": "string",
  "hasAudioRecording": "boolean",
  "syncStatus": "synced|pending|failed"
}
```

## Error Responses

All endpoints return errors in this format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      "service": "visits-service",
      "timestamp": "ISO datetime"
    }
  }
}
```

Common error codes:
- `VALIDATION_ERROR` - Missing or invalid request data
- `VISIT_NOT_FOUND` - Visit ID not found
- `FETCH_VISITS_ERROR` - Error retrieving visits
- `CREATE_VISIT_ERROR` - Error creating visit
- `UPDATE_VISIT_ERROR` - Error updating visit
- `ADD_NOTE_ERROR` - Error adding note to visit

## Usage Examples

### Add Note to Visit
```bash
curl -X POST http://localhost:3008/api/visits/visit-123/notes \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "noteText": "Patient responded well to medication. No adverse reactions observed.",
    "staffId": "staff-1001",
    "staffName": "Anna Virtanen",
    "noteType": "medication"
  }'
```

### Get Patient Visits with Tasks
```bash
curl -X GET "http://localhost:3008/api/visits/patient/patient-123/with-tasks?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Create Visit with Tasks
```bash
curl -X POST http://localhost:3008/api/visits \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "patient-123",
    "patient_name": "Matti Virtanen",
    "nurse_id": "staff-1001", 
    "nurse_name": "Anna Virtanen",
    "scheduled_time": "2025-12-03T14:00:00Z",
    "visit_type": "medication_administration",
    "taskCompletions": [
      {
        "taskId": "task-1",
        "taskType": "template",
        "taskTitle": "Administer morning medications",
        "taskCategory": "medication",
        "priority": "high",
        "completed": false
      }
    ]
  }'
```

### Complete a Task
```bash
curl -X PUT http://localhost:3008/api/visits/visit-123/tasks/task-1/complete \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "staffId": "staff-1001",
    "staffName": "Anna Virtanen",
    "notes": "Medication administered successfully. Patient tolerated well."
  }'
```

### Change Visit Status
```bash
curl -X PUT http://localhost:3008/api/visits/visit-123/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "awaitingDocumentation",
    "staffId": "staff-1001",
    "staffName": "Anna Virtanen"
  }'
```

### Workflow Example
```bash
# 1. Start visit
curl -X PUT http://localhost:3008/api/visits/visit-123/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "inProgress", "staffId": "staff-1001", "staffName": "Anna Virtanen"}'

# 2. Complete required tasks
curl -X PUT http://localhost:3008/api/visits/visit-123/tasks/task-1/complete \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"staffId": "staff-1001", "staffName": "Anna Virtanen", "notes": "Task completed"}'

# 3. Move to awaiting documentation
curl -X PUT http://localhost:3008/api/visits/visit-123/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "awaitingDocumentation", "staffId": "staff-1001", "staffName": "Anna Virtanen"}'

# 4. Add notes and complete visit
curl -X POST http://localhost:3008/api/visits/visit-123/notes \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"noteText": "All tasks completed successfully", "staffId": "staff-1001", "staffName": "Anna Virtanen"}'

curl -X PUT http://localhost:3008/api/visits/visit-123/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed", "staffId": "staff-1001", "staffName": "Anna Virtanen"}'
```