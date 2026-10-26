const express = require('express');
const { body } = require('express-validator');
const { chat } = require('../controllers/assistantController');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const { assistantLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post(
  '/chat',
  assistantLimiter,
  [
    body('messages').isArray({ min: 1 }).withMessage('messages must be a non-empty array.'),
    body('messages.*.role').isIn(['user', 'assistant']).withMessage('Each message needs a role of "user" or "assistant".'),
    body('messages.*.content')
      .isString()
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Each message needs content between 1 and 2000 characters.'),
  ],
  validate,
  asyncHandler(chat)
);

module.exports = router;
