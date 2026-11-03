const Service = require('../models/Service');
const comparisons = require('../data/comparisons');

async function listServices(req, res) {
  const { category, q } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { tagline: { $regex: q, $options: 'i' } },
    ];
  }
  const services = await Service.find(filter).sort({ category: 1, name: 1 });
  res.json({ services });
}

async function getCategories(req, res) {
  const categories = await Service.distinct('category');
  res.json({ categories: categories.sort() });
}

async function getService(req, res) {
  const service = await Service.findOne({ slug: req.params.slug });
  if (!service) {
    return res.status(404).json({ message: `No service found for "${req.params.slug}".` });
  }
  res.json({ service });
}

async function compareServices(req, res) {
  const { a, b } = req.query;
  if (!a || !b) {
    return res.status(400).json({ message: 'Provide both ?a= and ?b= service slugs to compare.' });
  }

  const [serviceA, serviceB] = await Promise.all([
    Service.findOne({ slug: a }),
    Service.findOne({ slug: b }),
  ]);

  if (!serviceA || !serviceB) {
    return res.status(404).json({ message: 'One or both services were not found in the catalog.' });
  }

  const curated = comparisons.find(
    (c) => (c.slugA === a && c.slugB === b) || (c.slugA === b && c.slugB === a)
  );

  let curatedResult = null;
  if (curated) {
    // Normalize so chooseA/chooseB always line up with serviceA/serviceB
    // regardless of which order the curated entry was written in.
    curatedResult = curated.slugA === a
      ? { chooseA: curated.chooseA, chooseB: curated.chooseB, verdict: curated.verdict }
      : { chooseA: curated.chooseB, chooseB: curated.chooseA, verdict: curated.verdict };
  }

  res.json({ serviceA, serviceB, curated: curatedResult });
}

async function listComparisons(req, res) {
  res.json({
    comparisons: comparisons.map((c) => ({ slugA: c.slugA, slugB: c.slugB })),
  });
}

module.exports = { listServices, getCategories, getService, compareServices, listComparisons };
