const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Visits Service API',
      version: '2.0.0',
      description: `
API for managing nurse visits and patient documentation in the Nursing Home Dashboard.

**Architecture (v2.0):**
- **MongoDB**: Primary storage for all visits (regulated + non-regulated)
- **MySQL**: Secondary storage for regulated medical visits only (FHIR compliance)

**Visit Classification:**
- \`isRegulated: true\` → Medical visits requiring licensed staff (stored in both databases)
- \`isRegulated: false\` → Care activities (stored only in MongoDB)

**Features:**
- 15 Visit Types (10 regulated, 5 non-regulated)
- 75 Visit Templates with default tasks
- 6 Categories: medical, assessment, therapy, emergency, care, social
- Task management within templates
- Support for mobile app features (photos, audio, offline sync)
      `,
      contact: {
        name: 'API Support',
        email: 'support@nursinghome.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3007',
        description: 'Development server'
      },
      {
        url: 'https://api.nursinghome.com/visits',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Visit: {
          type: 'object',
          required: ['patientId', 'patientName', 'nurseId', 'nurseName', 'scheduledTime', 'status'],
          properties: {
            _id: {
              type: 'string',
              description: 'MongoDB document ID',
              example: '507f1f77bcf86cd799439011'
            },
            patientId: {
              type: 'string',
              description: 'Patient ID',
              example: 'patient-001'
            },
            patientName: {
              type: 'string',
              description: 'Patient name',
              example: 'John Doe'
            },
            nurseId: {
              type: 'string',
              description: 'Nurse/Staff ID',
              example: 'S0001'
            },
            nurseName: {
              type: 'string',
              description: 'Nurse/Staff name',
              example: 'Jane Smith'
            },
            scheduledTime: {
              type: 'string',
              format: 'date-time',
              description: 'Scheduled visit time',
              example: '2025-11-15T10:00:00Z'
            },
            startTime: {
              type: 'string',
              format: 'date-time',
              description: 'Actual visit start time',
              example: '2025-11-15T10:05:00Z'
            },
            endTime: {
              type: 'string',
              format: 'date-time',
              description: 'Actual visit end time',
              example: '2025-11-15T10:30:00Z'
            },
            status: {
              type: 'string',
              enum: ['planned', 'inProgress', 'completed', 'cancelled'],
              description: 'Visit status',
              example: 'completed'
            },
            location: {
              type: 'string',
              description: 'Visit location',
              example: 'Room 101'
            },
            visitType: {
              type: 'string',
              description: 'Type of visit (references VisitType)',
              example: 'medical_assessment'
            },
            isRegulated: {
              type: 'boolean',
              description: 'Whether this is a regulated medical visit (also stored in MySQL)',
              example: true
            },
            requiresLicense: {
              type: 'boolean',
              description: 'Whether this visit requires a licensed healthcare worker',
              example: true
            },
            mysqlVisitId: {
              type: 'string',
              description: 'Reference to MySQL visits.id if isRegulated=true',
              example: 'V12345678'
            },
            taskCompletions: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/TaskCompletion'
              },
              description: 'List of task completions during the visit'
            },
            vitalSigns: {
              $ref: '#/components/schemas/VitalSigns'
            },
            notes: {
              type: 'string',
              description: 'Visit notes',
              example: 'Patient was cooperative and in good spirits'
            },
            audioRecordingPath: {
              type: 'string',
              description: 'Path to audio recording file',
              example: '/recordings/visit-001.mp3'
            },
            hasAudioRecording: {
              type: 'boolean',
              description: 'Whether the visit has an audio recording',
              example: true
            },
            photos: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'List of photo file paths',
              example: ['/photos/visit-001-1.jpg']
            },
            syncStatus: {
              type: 'string',
              enum: ['synced', 'pending', 'failed'],
              description: 'Synchronization status for mobile app',
              example: 'synced'
            },
            deviceId: {
              type: 'string',
              description: 'Device ID that created this visit (for mobile app)',
              example: 'device-12345'
            },
            offlineId: {
              type: 'string',
              description: 'Offline ID generated on device',
              example: 'offline-visit-001'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Record creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Record last update timestamp'
            }
          }
        },
        TaskCompletion: {
          type: 'object',
          required: ['taskId', 'taskTitle', 'completed'],
          properties: {
            taskId: {
              type: 'string',
              description: 'Task ID',
              example: 'T12345678'
            },
            taskTitle: {
              type: 'string',
              description: 'Task title',
              example: 'Check blood pressure'
            },
            completed: {
              type: 'boolean',
              description: 'Whether the task was completed',
              example: true
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the task was completed',
              example: '2023-12-01T10:15:00Z'
            },
            notes: {
              type: 'string',
              description: 'Notes about the task completion',
              example: 'BP was 120/80, within normal range'
            }
          }
        },
        VitalSigns: {
          type: 'object',
          properties: {
            temperature: {
              type: 'number',
              description: 'Body temperature in Celsius',
              example: 36.5
            },
            heartRate: {
              type: 'integer',
              description: 'Heart rate in beats per minute',
              example: 72
            },
            respiratoryRate: {
              type: 'integer',
              description: 'Respiratory rate per minute',
              example: 16
            },
            systolicBP: {
              type: 'integer',
              description: 'Systolic blood pressure',
              example: 120
            },
            diastolicBP: {
              type: 'integer',
              description: 'Diastolic blood pressure',
              example: 80
            },
            oxygenSaturation: {
              type: 'integer',
              description: 'Oxygen saturation percentage',
              example: 98
            },
            notes: {
              type: 'string',
              description: 'Notes about vital signs',
              example: 'All vitals within normal range'
            }
          }
        },
        VisitTemplate: {
          type: 'object',
          required: ['title', 'category', 'tags'],
          properties: {
            _id: {
              type: 'string',
              description: 'Template ID',
              example: '507f1f77bcf86cd799439011'
            },
            title: {
              type: 'string',
              description: 'Template name',
              example: 'Morning Care Routine'
            },
            description: {
              type: 'string',
              description: 'Template description',
              example: 'Morning bathing, dressing, and grooming assistance'
            },
            category: {
              type: 'string',
              enum: ['medical', 'assessment', 'therapy', 'emergency', 'care', 'social'],
              description: 'Template category',
              example: 'care'
            },
            estimatedDuration: {
              type: 'integer',
              description: 'Estimated duration in minutes',
              example: 45
            },
            isRequired: {
              type: 'boolean',
              description: 'Whether this requires a licensed healthcare worker',
              example: false
            },
            requiredSkills: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Required staff roles',
              example: ['care_assistant']
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Visit type tags',
              example: ['personal_care_assistance']
            },
            usageCount: {
              type: 'integer',
              description: 'Number of times this template has been used',
              example: 42
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the template is active',
              example: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          }
        },
        VisitTemplateTask: {
          type: 'object',
          required: ['taskTitle', 'order'],
          properties: {
            _id: {
              type: 'string',
              description: 'Task ID',
              example: '507f1f77bcf86cd799439012'
            },
            taskTitle: {
              type: 'string',
              description: 'Task title',
              example: 'Check vital signs'
            },
            isRequired: {
              type: 'boolean',
              description: 'Whether this task is required',
              example: true
            },
            order: {
              type: 'integer',
              description: 'Task order in the template',
              example: 1
            }
          }
        },
        VisitType: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Visit type ID'
            },
            name: {
              type: 'string',
              description: 'Visit type name',
              example: 'medical_assessment'
            },
            displayName: {
              type: 'string',
              description: 'Display name',
              example: 'Medical Assessment'
            },
            category: {
              type: 'string',
              enum: ['medical', 'assessment', 'therapy', 'emergency', 'care', 'social'],
              description: 'Visit category'
            },
            requiresLicense: {
              type: 'boolean',
              description: 'Whether this visit type requires a licensed healthcare worker',
              example: true
            },
            isRegulated: {
              type: 'boolean',
              description: 'Whether this is a regulated medical visit (stored in both MongoDB and MySQL)',
              example: true
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'Error message'
                },
                code: {
                  type: 'string',
                  description: 'Error code'
                }
              }
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            total: {
              type: 'integer',
              description: 'Total number of items'
            },
            page: {
              type: 'integer',
              description: 'Current page number'
            },
            limit: {
              type: 'integer',
              description: 'Number of items per page'
            },
            pages: {
              type: 'integer',
              description: 'Total number of pages'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js']
};

const specs = swaggerJsdoc(options);

module.exports = specs;
