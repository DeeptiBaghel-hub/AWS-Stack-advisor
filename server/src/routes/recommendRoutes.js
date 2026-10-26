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

// Public, unauthenticated — must be registered before the protected
// /history routes so it isn't shadowed, and deliberately named /shared/
// rather than /history/:id so it's obviously a different, public surface.
router.get('/shared/:shareId', asyncHandler(getSharedRecommendation));

router.post('/history', requireAuth, asyncHandler(saveRecommendation));
router.get('/history', requireAuth, asyncHandler(listRecommendations));
router.delete('/history/:id', requireAuth, asyncHandler(deleteRecommendation));

module.exports = router;
