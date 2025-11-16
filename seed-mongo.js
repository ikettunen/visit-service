const mongoose = require('mongoose');
require('dotenv').config();
const { seedVisitTemplates } = require('./src/db/seedVisitTemplates');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nursing_home_visits';

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    // Seed visit templates using the comprehensive seeding function
    console.log('Seeding visit templates...');
    const result = await seedVisitTemplates();
    
    console.log('✅ MongoDB seeding completed successfully!');
    console.log(`Total templates created: ${result.total}`);
    console.log(`Regulated templates: ${result.regulated}`);
    console.log(`Non-regulated templates: ${result.nonRegulated}`);
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ MongoDB seeding failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedDatabase();
