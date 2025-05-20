// controllers/debateController.js

const prisma = require('../prisma');

// Create a new debate
async function createDebate(req, res) {
  const userId = req.user.id;
  const { topic, description, categoryId } = req.body;

  if (!topic || topic.trim() === "") {
    return res.status(400).json({ error: "Topic is required" });
  }

  try {
    const debate = await prisma.debate.create({
      data: {
        topic,
        description,
        categoryId: categoryId ? parseInt(categoryId) : null,
        participants: {
          create: {
            userId,
            role: 'DEBATER',
          }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          }
        },
        category: true
      }
    });

    res.status(201).json({ message: 'Debate created successfully', debate });
  } catch (err) {
    console.error("Error creating debate:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Get all debates with pagination and filters
async function getDebates(req, res) {
  const { page = 1, limit = 10, status, categoryId, search } = req.query;
  const skip = (page - 1) * limit;

  try {
    const where = {};
    if (status) where.status = status;
    if (categoryId) where.categoryId = parseInt(categoryId);
    if (search) {
      where.OR = [
        { topic: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [debates, total] = await Promise.all([
      prisma.debate.findMany({
        where,
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatar: true
                }
              }
            }
          },
          category: true
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.debate.count({ where })
    ]);

    res.json({
      debates,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (err) {
    console.error("Error fetching debates:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Get a single debate by ID
async function getDebate(req, res) {
  const { id } = req.params;

  try {
    const debate = await prisma.debate.findUnique({
      where: { id: parseInt(id) },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            },
            votes: true
          }
        },
        category: true,
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!debate) {
      return res.status(404).json({ error: "Debate not found" });
    }

    res.json(debate);
  } catch (err) {
    console.error("Error fetching debate:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Join a debate
async function joinDebate(req, res) {
  const userId = req.user.id;
  const { id } = req.params;
  const { role, position } = req.body;

  try {
    const debate = await prisma.debate.findUnique({
      where: { id: parseInt(id) },
      include: { participants: true }
    });

    if (!debate) {
      return res.status(404).json({ error: "Debate not found" });
    }

    if (debate.status !== 'WAITING') {
      return res.status(400).json({ error: "Cannot join a debate that has already started or finished" });
    }

    // Check if user is already a participant
    const existingParticipant = debate.participants.find(p => p.userId === userId);
    if (existingParticipant) {
      return res.status(400).json({ error: "You are already a participant in this debate" });
    }

    const participant = await prisma.debateParticipant.create({
      data: {
        userId,
        debateId: parseInt(id),
        role: role || 'AUDIENCE',
        position
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

    res.status(201).json({ message: 'Joined debate successfully', participant });
  } catch (err) {
    console.error("Error joining debate:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Vote on a debate participant
async function voteOnParticipant(req, res) {
  const userId = req.user.id;
  const { participantId } = req.params;
  const { value } = req.body;

  if (![-1, 1].includes(value)) {
    return res.status(400).json({ error: "Vote value must be either 1 or -1" });
  }

  try {
    const participant = await prisma.debateParticipant.findUnique({
      where: { id: parseInt(participantId) },
      include: { debate: true }
    });

    if (!participant) {
      return res.status(404).json({ error: "Participant not found" });
    }

    if (participant.debate.status !== 'ONGOING') {
      return res.status(400).json({ error: "Can only vote in ongoing debates" });
    }

    // Check if user has already voted
    const existingVote = await prisma.vote.findUnique({
      where: {
        voterId_participantId: {
          voterId: userId,
          participantId: parseInt(participantId)
        }
      }
    });

    if (existingVote) {
      // Update existing vote
      const vote = await prisma.vote.update({
        where: { id: existingVote.id },
        data: { value }
      });
      return res.json({ message: 'Vote updated successfully', vote });
    }

    // Create new vote
    const vote = await prisma.vote.create({
      data: {
        voterId: userId,
        participantId: parseInt(participantId),
        value
      }
    });

    res.status(201).json({ message: 'Vote recorded successfully', vote });
  } catch (err) {
    console.error("Error voting:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Update debate status
async function updateDebateStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.id;

  try {
    const debate = await prisma.debate.findUnique({
      where: { id: parseInt(id) },
      include: { participants: true }
    });

    if (!debate) {
      return res.status(404).json({ error: "Debate not found" });
    }

    // Check if user is a participant
    const isParticipant = debate.participants.some(p => p.userId === userId);
    if (!isParticipant) {
      return res.status(403).json({ error: "Not authorized to update debate status" });
    }

    // Update status
    const updatedDebate = await prisma.debate.update({
      where: { id: parseInt(id) },
      data: { status },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    res.json(updatedDebate);
  } catch (err) {
    console.error("Error updating debate status:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Get user's debates
async function getMyDebates(req, res) {
  const userId = req.user.id;
  const { type } = req.params; // 'created' or 'participated'

  try {
    let debates;
    if (type === 'created') {
      debates = await prisma.debate.findMany({
        where: {
          participants: {
            some: {
              userId,
              role: 'DEBATER'
            }
          }
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatar: true
                }
              }
            }
          },
          category: true
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      debates = await prisma.debate.findMany({
        where: {
          participants: {
            some: {
              userId
            }
          }
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatar: true
                }
              }
            }
          },
          category: true
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    res.json(debates);
  } catch (err) {
    console.error("Error fetching user's debates:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Get debate statistics
async function getDebateStats(req, res) {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const debate = await prisma.debate.findUnique({
      where: { id: parseInt(id) },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            },
            votes: true
          }
        }
      }
    });

    if (!debate) {
      return res.status(404).json({ error: "Debate not found" });
    }

    // Check if user is a participant
    const isParticipant = debate.participants.some(p => p.userId === userId);
    if (!isParticipant) {
      return res.status(403).json({ error: "Not authorized to view debate statistics" });
    }

    // Calculate statistics
    const stats = debate.participants.map(participant => {
      const totalVotes = debate.participants.reduce((sum, p) => sum + p.votes.length, 0);
      const votesReceived = participant.votes.length;
      const winRate = totalVotes > 0 ? (votesReceived / totalVotes) * 100 : 0;

      return {
        userId: participant.user.id,
        name: participant.user.name,
        avatar: participant.user.avatar,
        role: participant.role,
        votesReceived,
        winRate,
        totalVotes
      };
    });

    res.json(stats);
  } catch (err) {
    console.error("Error fetching debate statistics:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  createDebate,
  getDebates,
  getDebate,
  joinDebate,
  voteOnParticipant,
  updateDebateStatus,
  getMyDebates,
  getDebateStats
};
