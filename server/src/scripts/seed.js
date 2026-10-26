// Populates (or updates) the service catalog collection.
// Safe to re-run: upserts by slug, so running it again after editing
// serviceCatalog.js just syncs the changes instead of creating duplicates.
//
// Usage: npm run seed   (from the server/ directory, with .env configured)

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Service = require('../models/Service');
const services = require('../data/serviceCatalog');

async function seed() {
  await connectDB(process.env.MONGO_URI);

  let created = 0;
  let updated = 0;

  for (const service of services) {
    const result = await Service.findOneAndUpdate(
      { slug: service.slug },
      { $set: service },
      { upsert: true, new: true, rawResult: true }
    );
    if (result.lastErrorObject?.updatedExisting) {
      updated++;
    } else {
      created++;
    }
  }

  console.log(`Seed complete: ${created} created, ${updated} updated, ${services.length} total in catalog.`);
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
