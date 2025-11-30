require('dotenv').config();
const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
const CarePlan = require('../src/models/CarePlan');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nursing_home_visits';

// MySQL connection config
const mysqlConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nursing_home_db'
};

// Care plan templates - will be populated with real patient IDs from MySQL
const carePlanTemplates = [
  {
    patientNameMatch: 'Matti Virtanen',
    template: {
      status: 'active',
      startDate: new Date('2025-11-01'),
      endDate: new Date('2026-01-31'),
      goals: [
        {
          description: 'Improve mobility and reduce fall risk',
          targetDate: new Date('2025-12-31'),
          status: 'in_progress',
          measurableOutcome: 'Patient can walk 50 meters with walker independently',
          progress: 45
        },
        {
          description: 'Maintain stable blood pressure',
          targetDate: new Date('2026-01-31'),
          status: 'in_progress',
          measurableOutcome: 'BP consistently below 140/90',
          progress: 70
        }
      ],
      interventions: [
        {
          visitType: 'Morning Care',
          frequency: {
            type: 'daily',
            times: 1,
            timeOfDay: ['08:00']
          },
          duration: 30,
          assignedRole: 'nurse',
          additionalTasks: []
        },
        {
          visitType: 'Medication Round',
          frequency: {
            type: 'daily',
            times: 3,
            timeOfDay: ['08:00', '14:00', '20:00']
          },
          duration: 10,
          assignedRole: 'nurse',
          additionalTasks: []
        },
        {
          visitType: 'Physical Therapy',
          frequency: {
            type: 'weekly',
            times: 3,
            daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
            timeOfDay: ['10:00']
          },
          duration: 45,
          assignedRole: 'physiotherapist',
          additionalTasks: []
        }
      ],
      conditions: [
        {
          code: 'I10',
          display: 'Essential (primary) hypertension',
          severity: 'moderate',
          onsetDate: new Date('2020-03-15')
        },
        {
          code: 'M62.81',
          display: 'Muscle weakness',
          severity: 'moderate',
          onsetDate: new Date('2024-08-01')
        }
      ],
      careTeam: [
        {
          userId: 'S0001',
          userName: 'Anna Virtanen',
          role: 'Primary Nurse',
          isPrimary: true
        },
        {
          userId: 'D0001',
          userName: 'Dr. Korhonen',
          role: 'Physician',
          isPrimary: false
        }
      ],
      createdBy: {
        userId: 'S0001',
        userName: 'Anna Virtanen'
      },
      lastReviewedDate: new Date('2025-11-01'),
      nextReviewDate: new Date('2025-12-01'),
      notes: 'Patient is motivated and cooperative. Family visits regularly.'
    }
  },
  {
    patientNameMatch: 'Aino Korhonen',
    template: {
      status: 'active',
      startDate: new Date('2025-10-15'),
      endDate: new Date('2026-02-15'),
      goals: [
        {
          description: 'Improve cognitive function and memory',
          targetDate: new Date('2026-01-15'),
          status: 'in_progress',
          measurableOutcome: 'Patient can recall daily activities and recognize family members',
          progress: 30
        },
        {
          description: 'Maintain adequate nutrition and hydration',
          targetDate: new Date('2026-02-15'),
          status: 'in_progress',
          measurableOutcome: 'Patient maintains weight within 5% of baseline',
          progress: 85
        }
      ],
      interventions: [
        {
          visitType: 'Morning Care',
          frequency: {
            type: 'daily',
            times: 1,
            timeOfDay: ['07:30']
          },
          duration: 45,
          assignedRole: 'nurse',
          additionalTasks: []
        },
        {
          visitType: 'Meal Assistance',
          frequency: {
            type: 'daily',
            times: 3,
            timeOfDay: ['08:00', '12:00', '18:00']
          },
          duration: 30,
          assignedRole: 'care_assistant',
          additionalTasks: []
        },
        {
          visitType: 'Cognitive Therapy',
          frequency: {
            type: 'weekly',
            times: 2,
            daysOfWeek: [2, 4], // Tue, Thu
            timeOfDay: ['14:00']
          },
          duration: 60,
          assignedRole: 'any',
          additionalTasks: []
        }
      ],
      conditions: [
        {
          code: 'F03',
          display: 'Unspecified dementia',
          severity: 'moderate',
          onsetDate: new Date('2022-06-01')
        },
        {
          code: 'R63.4',
          display: 'Abnormal weight loss',
          severity: 'mild',
          onsetDate: new Date('2025-09-01')
        }
      ],
      careTeam: [
        {
          userId: 'S0002',
          userName: 'Matti Korhonen',
          role: 'Primary Nurse',
          isPrimary: true
        },
        {
          userId: 'S0003',
          userName: 'Liisa Nieminen',
          role: 'Care Assistant',
          isPrimary: false
        }
      ],
      createdBy: {
        userId: 'S0002',
        userName: 'Matti Korhonen'
      },
      lastReviewedDate: new Date('2025-10-15'),
      nextReviewDate: new Date('2025-11-15'),
      notes: 'Patient requires gentle reminders and patience. Responds well to music therapy.'
    }
  },
  {
    patientNameMatch: 'Eino Mäkinen',
    template: {
      status: 'active',
      startDate: new Date('2025-11-10'),
      endDate: new Date('2026-03-10'),
      goals: [
        {
          description: 'Manage diabetes and maintain stable blood sugar',
          targetDate: new Date('2026-02-10'),
          status: 'in_progress',
          measurableOutcome: 'HbA1c below 7.0%',
          progress: 60
        },
        {
          description: 'Prevent diabetic foot complications',
          targetDate: new Date('2026-03-10'),
          status: 'in_progress',
          measurableOutcome: 'No new foot ulcers or infections',
          progress: 90
        }
      ],
      interventions: [
        {
          visitType: 'Blood Sugar Check',
          frequency: {
            type: 'daily',
            times: 4,
            timeOfDay: ['07:00', '11:30', '17:00', '21:00']
          },
          duration: 10,
          assignedRole: 'nurse',
          additionalTasks: []
        },
        {
          visitType: 'Insulin Administration',
          frequency: {
            type: 'daily',
            times: 3,
            timeOfDay: ['07:30', '12:00', '18:00']
          },
          duration: 15,
          assignedRole: 'nurse',
          additionalTasks: []
        },
        {
          visitType: 'Foot Care',
          frequency: {
            type: 'weekly',
            times: 2,
            daysOfWeek: [1, 4], // Mon, Thu
            timeOfDay: ['10:00']
          },
          duration: 30,
          assignedRole: 'nurse',
          additionalTasks: []
        }
      ],
      conditions: [
        {
          code: 'E11',
          display: 'Type 2 diabetes mellitus',
          severity: 'moderate',
          onsetDate: new Date('2015-03-20')
        },
        {
          code: 'E11.621',
          display: 'Type 2 diabetes with foot ulcer',
          severity: 'moderate',
          onsetDate: new Date('2024-05-10')
        }
      ],
      careTeam: [
        {
          userId: 'S0001',
          userName: 'Anna Virtanen',
          role: 'Primary Nurse',
          isPrimary: true
        },
        {
          userId: 'D0002',
          userName: 'Dr. Lahtinen',
          role: 'Endocrinologist',
          isPrimary: false
        }
      ],
      createdBy: {
        userId: 'S0001',
        userName: 'Anna Virtanen'
      },
      lastReviewedDate: new Date('2025-11-10'),
      nextReviewDate: new Date('2025-12-10'),
      notes: 'Patient is compliant with medication. Family educated on diabetes management.'
    }
  }
];

async function seedCarePlans() {
  let mysqlConnection = null;
  
  try {
    console.log('Connecting to MySQL...');
    mysqlConnection = await mysql.createConnection(mysqlConfig);
    console.log('✓ Connected to MySQL');
    
    console.log('\nFetching patient IDs from MySQL...');
    const carePlans = [];
    
    for (const template of carePlanTemplates) {
      const [firstName, lastName] = template.patientNameMatch.split(' ');
      console.log(`  Looking up: ${firstName} ${lastName}...`);
      
      const [rows] = await mysqlConnection.execute(
        'SELECT id, first_name, last_name FROM patients WHERE first_name = ? AND last_name = ? AND active = 1 LIMIT 1',
        [firstName, lastName]
      );
      
      if (rows.length > 0) {
        const patient = rows[0];
        console.log(`  ✓ Found: ${patient.first_name} ${patient.last_name} (ID: ${patient.id})`);
        
        carePlans.push({
          patientId: patient.id,
          patientName: `${patient.first_name} ${patient.last_name}`,
          ...template.template
        });
      } else {
        console.log(`  ✗ Not found: ${firstName} ${lastName} - skipping`);
      }
    }
    
    if (carePlans.length === 0) {
      console.log('\n⚠️  No matching patients found in MySQL. Cannot seed care plans.');
      console.log('💡 Make sure the FHIR backend seed script has been run first:');
      console.log('   cd fhir-api-backend && npm run seed');
      return;
    }
    
    console.log(`\n✓ Found ${carePlans.length} matching patients`);
    
    console.log('\nConnecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Clear existing care plans
    console.log('\nClearing existing care plans...');
    const deleteResult = await CarePlan.deleteMany({});
    console.log(`✓ Cleared ${deleteResult.deletedCount} existing care plans`);

    // Insert new care plans
    console.log('\nInserting care plans...');
    const result = await CarePlan.insertMany(carePlans);
    console.log(`✓ Successfully inserted ${result.length} care plans`);

    // Display summary
    console.log('\n' + '='.repeat(70));
    console.log('CARE PLANS SUMMARY');
    console.log('='.repeat(70));
    
    for (const plan of result) {
      console.log(`\n📋 ${plan.patientName}`);
      console.log(`   Patient ID: ${plan.patientId}`);
      console.log(`   Status: ${plan.status}`);
      console.log(`   Goals: ${plan.goals.length}`);
      console.log(`   Interventions: ${plan.interventions.length}`);
      console.log(`   Conditions: ${plan.conditions.length}`);
      console.log(`   Care Team: ${plan.careTeam.length} members`);
      console.log(`   Period: ${plan.startDate.toISOString().split('T')[0]} to ${plan.endDate.toISOString().split('T')[0]}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ CARE PLAN SEEDING COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(70));
    
    console.log('\n💡 Test these patient URLs in your browser:');
    for (const plan of result) {
      console.log(`   http://localhost:3000/patients/${plan.patientId}`);
    }
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Error seeding care plans:', error);
    console.error('Error details:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure MySQL is running and connection details in .env are correct');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Check MySQL username and password in .env file');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n💡 Database does not exist. Run the FHIR backend seed script first');
    }
    
    process.exit(1);
  } finally {
    if (mysqlConnection) {
      await mysqlConnection.end();
      console.log('MySQL connection closed');
    }
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Run if called directly
if (require.main === module) {
  seedCarePlans();
}

module.exports = seedCarePlans;
