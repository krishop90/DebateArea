const express = require('express');
const router = express.Router();
const passport = require('passport');
const { signup, login, getProfile, updateProfile, updatePassword, deleteAccount } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { generateToken } = require('../utils/tokenUtils');

// Auth routes
router.post('/signup', signup);
router.post('/login', login);

// Protected routes
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/password', authenticate, updatePassword);
router.delete('/account', authenticate, deleteAccount);

// Social auth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: '/auth/failure',
    session: false 
  }),
  (req, res) => {
    const token = generateToken(req.user);
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

// GitHub Auth
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
router.get('/github/callback',
  passport.authenticate('github', {
    failureRedirect: '/auth/failure',
    session: false
  }),
  (req, res) => {
    const token = generateToken(req.user);
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

// Success and failure routes
router.get('/success', (req, res) => {
  res.json({ message: 'OAuth Login Successful', user: req.user });
});

router.get('/failure', (req, res) => {
  res.status(401).json({ message: 'OAuth Login Failed' });
});

module.exports = router;
