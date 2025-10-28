const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Visits Service API',
      version: '1.0.0',
      description: 'API for managing nurse visits and patient documentation in the Nursing Home Dashboard',
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
            id: {
              type: 'string',
              description: 'Unique visit identifier',
              example: 'V12345678'
            },
            patientId: {
              type: 'string',
              description: 'Patient ID',
              example: 'P12345678'
            },
            patientName: {
              type: 'string',
              description: 'Patient name',
              example: 'John Doe'
            },
            nurseId: {
              type: 'string',
              description: 'Nurse ID',
              example: 'N12345678'
            },
            nurseName: {
              type: 'string',
              description: 'Nurse name',
              example: 'Jane Smith'
            },
            scheduledTime: {
              type: 'string',
              format: 'date-time',
              description: 'Scheduled visit time',
              example: '2023-12-01T10:00:00Z'
            },
            startTime: {
              type: 'string',
              format: 'date-time',
              description: 'Actual visit start time',
              example: '2023-12-01T10:05:00Z'
            },
            endTime: {
              type: 'string',
              format: 'date-time',
              description: 'Actual visit end time',
              example: '2023-12-01T10:30:00Z'
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
              example: 'Room 204A'
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
              example: '/uploads/recordings/visit_12345678.aac'
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
              example: ['/uploads/photos/visit_12345678_1.jpg']
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
              description: 'Total number of visits'
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
