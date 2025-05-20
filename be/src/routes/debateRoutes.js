const express = require('express');
const router = express.Router();
const { 
  createDebate,
  getDebates,
  getDebate,
  joinDebate,
  voteOnParticipant,
  updateDebateStatus,
  getMyDebates,
  getDebateStats
} = require('../controllers/debateController');
const { authenticate } = require('../middleware/auth');

// Public routes
router.get('/', getDebates);
router.get('/:id', getDebate);

// Protected routes
router.post('/', authenticate, createDebate);
router.post('/:id/join', authenticate, joinDebate);
router.post('/:id/vote', authenticate, voteOnParticipant);
router.put('/:id/status', authenticate, updateDebateStatus);
router.get('/my/:type', authenticate, getMyDebates);
router.get('/:id/stats', authenticate, getDebateStats);

module.exports = router;
