const express = require('express');
const router = express.Router();
const {
  createComment,
  getComments,
  updateComment,
  deleteComment
} = require('../controllers/commentController');
const { authenticate } = require('../middleware/auth');

// Get comments for a debate
router.get('/debates/:debateId/comments', getComments);

// Create a new comment
router.post('/debates/:debateId/comments', authenticate, createComment);

// Update a comment
router.put('/comments/:commentId', authenticate, updateComment);

// Delete a comment
router.delete('/comments/:commentId', authenticate, deleteComment);

module.exports = router; 