const prisma = require('../prisma');

// Create a new comment
async function createComment(req, res) {
  const userId = req.user.id;
  const { debateId } = req.params;
  const { content, parentId } = req.body;

  if (!content || content.trim() === "") {
    return res.status(400).json({ error: "Comment content is required" });
  }

  try {
    const comment = await prisma.comment.create({
      data: {
        content,
        userId,
        debateId: parseInt(debateId),
        parentId: parentId ? parseInt(parentId) : null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    res.status(201).json({ message: 'Comment created successfully', comment });
  } catch (err) {
    console.error("Error creating comment:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Get comments for a debate
async function getComments(req, res) {
  const { debateId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  try {
    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: {
          debateId: parseInt(debateId),
          parentId: null // Only get top-level comments
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.comment.count({
        where: {
          debateId: parseInt(debateId),
          parentId: null
        }
      })
    ]);

    // Get replies for each comment
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await prisma.comment.findMany({
          where: { parentId: comment.id },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        });
        return { ...comment, replies };
      })
    );

    res.json({
      comments: commentsWithReplies,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (err) {
    console.error("Error fetching comments:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Update a comment
async function updateComment(req, res) {
  const userId = req.user.id;
  const { commentId } = req.params;
  const { content } = req.body;

  if (!content || content.trim() === "") {
    return res.status(400).json({ error: "Comment content is required" });
  }

  try {
    const comment = await prisma.comment.findUnique({
      where: { id: parseInt(commentId) }
    });

    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (comment.userId !== userId) {
      return res.status(403).json({ error: "Not authorized to update this comment" });
    }

    const updatedComment = await prisma.comment.update({
      where: { id: parseInt(commentId) },
      data: { content },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    res.json({ message: 'Comment updated successfully', comment: updatedComment });
  } catch (err) {
    console.error("Error updating comment:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Delete a comment
async function deleteComment(req, res) {
  const userId = req.user.id;
  const { commentId } = req.params;

  try {
    const comment = await prisma.comment.findUnique({
      where: { id: parseInt(commentId) }
    });

    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (comment.userId !== userId) {
      return res.status(403).json({ error: "Not authorized to delete this comment" });
    }

    await prisma.comment.deleteMany({
      where: { parentId: parseInt(commentId) }
    });

    // Delete the comment
    await prisma.comment.delete({
      where: { id: parseInt(commentId) }
    });

    res.json({ message: 'Comment deleted successfully' });
  } catch (err) {
    console.error("Error deleting comment:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  createComment,
  getComments,
  updateComment,
  deleteComment
}; 