'use strict';

const { Router } = require('express');
const controller = require('../controllers/auth.controller');
const { requireSession } = require('../middleware/session');
const { authRateLimiter } = require('../middleware/security');
const { validateBody } = require('../validators/engine');
const { loginRules, signupRules } = require('../validators/auth.validators');

const router = Router();

router.post(
  '/login',
  authRateLimiter,
  validateBody(loginRules),
  controller.login,
);
router.post(
  '/signup',
  authRateLimiter,
  validateBody(signupRules),
  controller.signup,
);
router.get('/me', requireSession, controller.me);
router.post('/logout', requireSession, controller.logout);

module.exports = router;
