const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Require models
const Booking = require('../server/models/Booking');
const InstantService = require('../server/models/InstantService');

async function updateServiceNames() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    // Update Bookings
    console.log('Updating Bookings...');
    const bookingResult = await Booking.updateMany(
      { "packageServices.name": "فيك نيلز" },
      { $set: { "packageServices.$[elem].name": "فيك نيلز💅" } },
      { arrayFilters: [{ "elem.name": "فيك نيلز" }] }
    );
    console.log(`- Matched Bookings: ${bookingResult.matchedCount}`);
    console.log(`- Updated Bookings: ${bookingResult.modifiedCount}`);

    // Update Instant Services
    console.log('Updating Instant Services...');
    const instantServiceResult = await InstantService.updateMany(
      { "services.name": "فيك نيلز" },
      { $set: { "services.$[elem].name": "فيك نيلز💅" } },
      { arrayFilters: [{ "elem.name": "فيك نيلز" }] }
    );
    console.log(`- Matched Instant Services: ${instantServiceResult.matchedCount}`);
    console.log(`- Updated Instant Services: ${instantServiceResult.modifiedCount}`);

    console.log('Migration complete successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error during migration:', err);
    process.exit(1);
  }
}

updateServiceNames();
