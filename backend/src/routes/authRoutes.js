const express = require('express');
const { body } = require('express-validator');
const { register, login, me, updateProfile } = require('../controllers/authController');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('email').isEmail().withMessage('Enter a valid email.'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  ],
  validate,
  asyncHandler(register)
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Enter a valid email.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  validate,
  asyncHandler(login)
);

router.get('/me', requireAuth, asyncHandler(me));

router.put(
  '/profile',
  requireAuth,
  [
    body('name').optional().trim().notEmpty().withMessage('Name can\'t be empty.'),
    body('newPassword').optional().isLength({ min: 8 }).withMessage('New password must be at least 8 characters.'),
    body('currentPassword').optional().notEmpty().withMessage('Current password can\'t be empty.'),
  ],
  validate,
  asyncHandler(updateProfile)
);

module.exports = router;
