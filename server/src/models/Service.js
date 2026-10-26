const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    category: { type: String, required: true, index: true },
    tag: { type: String, required: true }, // icon key
    tagline: { type: String, required: true },
    description: { type: String, required: true },
    managementLevel: { type: String, enum: ['serverless', 'managed', 'self-managed'], required: true },
    pricingModel: { type: String, required: true },
    scaling: { type: String, required: true },
    freeTier: { type: String, required: true },
    bestFor: { type: [String], default: [] },
    watchOuts: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', serviceSchema);
