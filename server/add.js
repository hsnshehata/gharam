const mongoose = require('mongoose');
const InstantService = require('./models/InstantService');

async function migrateInstantServiceIds() {
  try {
    await mongoose.connect('mongodb://localhost/beauty-center', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    const instantServices = await InstantService.find();
    console.log(`Found ${instantServices.length} instant services`);

    for (const instantService of instantServices) {
      let needsUpdate = false;
      const updatedServices = instantService.services.map(srv => {
        if (typeof srv._id !== 'string') {
          needsUpdate = true;
          console.log(`Converting _id for service in instantService ${instantService._id}:`, srv._id);
          return {
            ...srv,
            _id: srv._id.toString()
          };
        }
        return srv;
      });

      if (needsUpdate) {
        console.log(`Fixing services for instant service ${instantService._id}`);
        instantService.services = updatedServices;
        await instantService.save();
      } else {
        console.log(`No update needed for instant service ${instantService._id}`);
      }
    }
    console.log('Migration completed');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

migrateInstantServiceIds();