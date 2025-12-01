/**
 * Seed script to create sample tasks for existing MySQL visits
 * This will populate the visit_tasks table with sample tasks for testing
 */

const { executeQuery } = require('../src/config/database');
const VisitTask = require('../src/models/VisitTask');

async function seedVisitTasks() {
  try {
    console.log('🌱 Starting visit tasks seeding...');

    // Get all visits from MySQL
    const visits = await executeQuery('SELECT id, patient_name, status FROM visits ORDER BY scheduled_time DESC LIMIT 20');
    console.log(`Found ${visits.length} visits to seed with tasks`);

    if (visits.length === 0) {
      console.log('No visits found. Please create some visits first.');
      return;
    }

    // Sample task templates
    const taskTemplates = [
      {
        task_id: 'vital-signs-check',
        task_title: 'Check Vital Signs',
        description: 'Measure blood pressure, heart rate, and temperature'
      },
      {
        task_id: 'medication-admin',
        task_title: 'Administer Medications',
        description: 'Give prescribed medications according to care plan'
      },
      {
        task_id: 'mobility-assist',
        task_title: 'Mobility Assessment',
        description: 'Help patient with walking and mobility exercises'
      },
      {
        task_id: 'hygiene-care',
        task_title: 'Personal Hygiene Care',
        description: 'Assist with personal hygiene and grooming'
      },
      {
        task_id: 'nutrition-check',
        task_title: 'Nutrition Monitoring',
        description: 'Monitor food intake and dietary requirements'
      },
      {
        task_id: 'safety-assessment',
        task_title: 'Safety Check',
        description: 'Assess room safety and fall risk factors'
      }
    ];

    let totalTasksCreated = 0;

    // Create tasks for each visit
    for (const visit of visits) {
      console.log(`\nCreating tasks for visit ${visit.id} (${visit.patient_name})...`);

      // Randomly select 2-4 tasks for each visit
      const numTasks = Math.floor(Math.random() * 3) + 2; // 2-4 tasks
      const selectedTasks = taskTemplates
        .sort(() => 0.5 - Math.random())
        .slice(0, numTasks);

      const tasksToCreate = selectedTasks.map((template, index) => {
        const isCompleted = visit.status === 'finished' || visit.status === 'completed';
        const completedAt = isCompleted ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000) : null;
        
        return {
          visit_id: visit.id,
          task_id: template.task_id,
          task_title: template.task_title,
          completed: isCompleted,
          completed_at: completedAt,
          notes: isCompleted ? `Completed successfully for ${visit.patient_name}` : null
        };
      });

      // Create tasks for this visit
      try {
        const createdTasks = await VisitTask.createBulk(visit.id, tasksToCreate);
        console.log(`  ✅ Created ${createdTasks.length} tasks for visit ${visit.id}`);
        totalTasksCreated += createdTasks.length;
      } catch (error) {
        console.error(`  ❌ Failed to create tasks for visit ${visit.id}:`, error.message);
      }
    }

    console.log(`\n🎉 Seeding complete! Created ${totalTasksCreated} tasks for ${visits.length} visits.`);
    
    // Show sample of created tasks
    const sampleTasks = await executeQuery(`
      SELECT vt.*, v.patient_name 
      FROM visit_tasks vt 
      JOIN visits v ON vt.visit_id = v.id 
      ORDER BY vt.created_at DESC 
      LIMIT 5
    `);
    
    console.log('\n📋 Sample created tasks:');
    sampleTasks.forEach(task => {
      console.log(`  - ${task.task_title} for ${task.patient_name} (${task.completed ? 'Completed' : 'Pending'})`);
    });

  } catch (error) {
    console.error('❌ Error seeding visit tasks:', error);
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedVisitTasks()
    .then(() => {
      console.log('\n✅ Visit tasks seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Visit tasks seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedVisitTasks };