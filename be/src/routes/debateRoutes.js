const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  createDebate,
  getDebates,
  getDebate,
  joinDebate,
  voteOnDebater,
  sendMessage,
  getMyDebates,
  endDebate,
  getUserDebateStats,
  startDebateTimer,
  analyzeDebateResults,
  requestResults
} = require('../controllers/debateController');

// Public routes
router.get('/', getDebates);
router.get('/:id', getDebate);

// Protected routes
router.use(authenticate);
router.post('/', createDebate);
router.post('/:id/join', joinDebate);
router.post('/:id/vote', voteOnDebater);
router.post('/:id/messages', sendMessage);
router.post('/:id/end', endDebate);
router.post('/:id/start', startDebateTimer);
router.post('/:id/request-results', requestResults);
router.get('/my-debates', getMyDebates);
router.get('/user/stats', getUserDebateStats);

module.exports = router;
