const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const c = require('../controllers/authController');

// Brute-force protection: 10 attempts / 15 min per IP
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, try again later' } });

router.post('/login', authLimiter, c.login);
router.post('/mfa/setup', requireAuth('mfa-setup'), c.mfaSetup);
router.post('/mfa/verify-setup', authLimiter, requireAuth('mfa-setup'), c.mfaVerifySetup);
router.post('/mfa/verify', authLimiter, requireAuth('mfa'), c.mfaVerify);
router.get('/me', requireAuth('access'), c.me);

module.exports = router;
