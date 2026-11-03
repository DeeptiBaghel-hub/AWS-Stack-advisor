const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const {
  listServices,
  getCategories,
  getService,
  compareServices,
  listComparisons,
} = require('../controllers/serviceController');

const router = express.Router();

// Order matters: specific paths before the /:slug catch-all.
router.get('/categories', asyncHandler(getCategories));
router.get('/compare/featured', asyncHandler(listComparisons));
router.get('/compare', asyncHandler(compareServices));
router.get('/', asyncHandler(listServices));
router.get('/:slug', asyncHandler(getService));

module.exports = router;
