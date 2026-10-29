const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const { authenticator } = require('otplib');
const User = require('../models/User');

authenticator.options = { window: 1 }; // allow +/- 30 s clock drift

const sign = (user, purpose, expiresIn) =>
  jwt.sign({ sub: user._id.toString(), username: user.username, role: user.role, purpose },
           process.env.JWT_SECRET, { expiresIn });

// POST /api/auth/login  { username, password }
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ success: false, message: 'Username and password are required' });
    const user = await User.findOne({ username: String(username).toLowerCase().trim() });
    if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (!user.mfaEnabled) {
      return res.json({ success: true, mfaSetupRequired: true,
        setupToken: sign(user, 'mfa-setup', '10m'),
        message: 'Password OK. MFA must be set up before access is granted.' });
    }
    return res.json({ success: true, mfaRequired: true,
      mfaToken: sign(user, 'mfa', '5m'),
      message: 'Password OK. Enter the 6-digit code from your authenticator app.' });
  } catch (e) { next(e); }
};

// POST /api/auth/mfa/setup   (Bearer setupToken) -> QR code
const mfaSetup = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub);
    const secret = authenticator.generateSecret();
    user.mfaTempSecret = secret;
    await user.save();
    const otpauth = authenticator.keyuri(user.username, process.env.MFA_ISSUER || 'BloodDonorMS', secret);
    const qrDataUrl = await QRCode.toDataURL(otpauth);
    res.json({ success: true, otpauth, otpauthUrl: otpauth, qrDataUrl, secret, message: 'Scan with Google/Microsoft Authenticator, then verify a code.' });
  } catch (e) { next(e); }
};

// POST /api/auth/mfa/verify-setup  (Bearer setupToken) { code }
const mfaVerifySetup = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub).select('+mfaTempSecret');
    if (!user.mfaTempSecret || !authenticator.check(String(req.body.code || ''), user.mfaTempSecret)) {
      return res.status(401).json({ success: false, message: 'Invalid authenticator code' });
    }
    await User.updateOne({ _id: user._id }, { $set: { mfaSecret: user.mfaTempSecret, mfaEnabled: true }, $unset: { mfaTempSecret: '' } });
    res.json({ success: true, token: sign(user, 'access', process.env.JWT_EXPIRES_IN || '1h'),
      user: { username: user.username, role: user.role }, message: 'MFA enabled. Logged in.' });
  } catch (e) { next(e); }
};

// POST /api/auth/mfa/verify  (Bearer mfaToken) { code }
const mfaVerify = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub).select('+mfaSecret');
    if (!user || !user.mfaEnabled || !authenticator.check(String(req.body.code || ''), user.mfaSecret)) {
      return res.status(401).json({ success: false, message: 'Invalid authenticator code' });
    }
    res.json({ success: true, token: sign(user, 'access', process.env.JWT_EXPIRES_IN || '1h'),
      user: { username: user.username, role: user.role }, message: 'Login successful' });
  } catch (e) { next(e); }
};

// GET /api/auth/me (Bearer access token)
const me = (req, res) => res.json({ success: true, user: req.user });

module.exports = { login, mfaSetup, mfaVerifySetup, mfaVerify, me };
