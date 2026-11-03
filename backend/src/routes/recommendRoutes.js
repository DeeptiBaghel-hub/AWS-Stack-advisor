const express = require('express');
const { body } = require('express-validator');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const { assistantLimiter } = require('../middleware/rateLimit');
const {
  recommend,
  fromDescription,
  saveRecommendation,
  listRecommendations,
  deleteRecommendation,
  getSharedRecommendation,
} = require('../controllers/recommendController');

const router = express.Router();
router.use(requireAuth);

router.post('/', [body('answers').isObject().withMessage('answers must be an object.')], validate, recommend);

// Costs real Gemini quota per call, same shared-cost consideration as the
// chat assistant — reuses the same limiter rather than a separate budget.
router.post(
  '/from-description',
  assistantLimiter,
  [
    body('description')
      .isString()
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Describe your project in a bit more detail (10-1000 characters).'),
  ],
  validate,
  asyncHandler(fromDescription)
);

// Register shared results before /history so the route is not shadowed.
router.get('/shared/:shareId', asyncHandler(getSharedRecommendation));

router.post('/history', asyncHandler(saveRecommendation));
router.get('/history', asyncHandler(listRecommendations));
router.delete('/history/:id', asyncHandler(deleteRecommendation));

module.exports = router;
