const mongoose = require('mongoose');
const crypto = require('crypto');

const recommendationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    answers: { type: Object, required: true },
    title: { type: String, required: true },
    diagram: { type: mongoose.Schema.Types.Mixed, default: () => ({ nodes: [], edges: [] }) },
    why: { type: Array, default: [] },
    footnotes: { type: Array, default: [] },
    wellArchitected: { type: mongoose.Schema.Types.Mixed, default: null },
    // Random, unguessable, and separate from Mongo's _id on purpose: _id's
    // timestamp-influenced structure can leak roughly how many documents
    // exist and when they were created. This is a dedicated, meaningless
    // identifier safe to put in a public URL.
    shareId: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(8).toString('hex'),
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Recommendation', recommendationSchema);
