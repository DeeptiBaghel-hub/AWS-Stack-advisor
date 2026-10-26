const { computeRecommendation } = require('../utils/recommendationEngine');
const { extractRequirements } = require('../utils/requirementExtraction');
const Recommendation = require('../models/Recommendation');

function recommend(req, res) {
  const { answers } = req.body;
  const result = computeRecommendation(answers || {});
  res.json(result);
}

// The AI only extracts the same five structured parameters the stepped
// quiz collects — it never invents services or diagram structure itself.
// Everything downstream of extraction runs through the exact same
// computeRecommendation() engine as the quiz path, so a description-driven
// result is exactly as grounded and testable as a quiz-driven one.
async function fromDescription(req, res) {
  const { description } = req.body;

  const extracted = await extractRequirements(description);
  if (!extracted) {
    const err = new Error('Could not extract requirements from description');
    err.status = 502;
    err.publicMessage = 'Couldn\'t quite understand that — try describing what you\'re building, roughly how many users, and any specific database or infrastructure needs.';
    throw err;
  }

  const result = computeRecommendation(extracted);
  res.json({ ...result, extracted, description });
}

async function saveRecommendation(req, res) {
  const { answers, title, diagram, why, footnotes, wellArchitected } = req.body;

  const saved = await Recommendation.create({
    user: req.userId,
    answers,
    title,
    diagram,
    why,
    footnotes,
    wellArchitected: wellArchitected || null,
  });

  res.status(201).json({ recommendation: saved });
}

async function listRecommendations(req, res) {
  const items = await Recommendation.find({ user: req.userId }).sort({ createdAt: -1 });
  res.json({ recommendations: items });
}

async function deleteRecommendation(req, res) {
  const { id } = req.params;
  const deleted = await Recommendation.findOneAndDelete({ _id: id, user: req.userId });
  if (!deleted) {
    return res.status(404).json({ message: 'That saved recommendation was not found.' });
  }
  res.json({ deleted: true });
}

// Public — no auth. Deliberately returns only what's needed to render the
// result (title, diagram, why, footnotes, score) and never the owning
// user's id, email, or their raw quiz answers, so sharing a link doesn't
// leak more than "here's what it recommended."
async function getSharedRecommendation(req, res) {
  const { shareId } = req.params;
  const item = await Recommendation.findOne({ shareId });
  if (!item) {
    return res.status(404).json({ message: 'This shared link doesn\'t exist, or the recommendation behind it was deleted.' });
  }
  res.json({
    recommendation: {
      title: item.title,
      diagram: item.diagram,
      why: item.why,
      footnotes: item.footnotes,
      wellArchitected: item.wellArchitected,
      createdAt: item.createdAt,
    },
  });
}

module.exports = {
  recommend,
  fromDescription,
  saveRecommendation,
  listRecommendations,
  deleteRecommendation,
  getSharedRecommendation,
};
