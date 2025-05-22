// controllers/debateController.js

const prisma = require('../prisma');
const axios = require('axios');
const { analyzeDebate } = require('../utils/aiUtils');

// Create a new debate
async function createDebate(req, res) {
  try {
    const { topic, description, categoryId } = req.body;

    // Create the debate with the creator as a debater
    const debate = await prisma.debate.create({
      data: {
        topic,
        description,
        status: 'WAITING',
        creatorId: req.user.id,
        category: categoryId ? {
          connect: { id: parseInt(categoryId) }
        } : undefined,
        participants: {
          create: {
            userId: req.user.id,
            role: 'DEBATER'
          }
        }
      },
      include: {
        participants: {
          include: {
            user: true
          }
        },
        category: true,
        creator: true
      }
    });

    // Emit real-time event
    req.app.get('io').emit('newDebate', debate);

    res.status(201).json({ debate });
  } catch (error) {
    console.error('Error creating debate:', error);
    res.status(500).json({ 
      message: 'Failed to create debate', 
      error: error.message 
    });
  }
}

// Get active debates (WAITING or ONGOING)
async function getDebates(req, res) {
  try {
    const { search, categoryId } = req.query;
    const where = {
      status: {
        in: ['WAITING', 'ONGOING']
      }
    };

    if (search) {
      where.OR = [
        { topic: { contains: search } },
        { description: { contains: search } }
      ];
    }

    if (categoryId) {
      where.categoryId = parseInt(categoryId);
    }

    const debates = await prisma.debate.findMany({
      where,
      include: {
        participants: {
          include: {
            user: true
          }
        },
        category: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ debates });
  } catch (error) {
    console.error('Error fetching debates:', error);
    res.status(500).json({ message: 'Failed to fetch debates' });
  }
}

// Get a specific debate
async function getDebate(req, res) {
  try {
    const { id } = req.params;
    const debate = await prisma.debate.findUnique({
      where: { id: parseInt(id) },
      include: {
        participants: {
          include: {
            user: true,
            votesReceived: true,
            votesGiven: true
          }
        },
        category: true,
        comments: {
          include: {
            user: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    if (!debate) {
      return res.status(404).json({ message: 'Debate not found' });
    }

    res.json({ debate });
  } catch (error) {
    console.error('Error fetching debate:', error);
    res.status(500).json({ message: 'Failed to fetch debate' });
  }
}

// Join a debate
async function joinDebate(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ message: 'Role is required' });
    }

    if (!['DEBATER', 'AUDIENCE'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be either DEBATER or AUDIENCE' });
    }

    // First check if the debate exists
    const debate = await prisma.debate.findUnique({
      where: { id: parseInt(id) },
      include: {
        participants: {
          include: {
            user: true
          }
        },
        category: true
      }
    });

    if (!debate) {
      return res.status(404).json({ message: 'Debate not found' });
    }

    if (debate.status === 'FINISHED') {
      return res.status(400).json({ message: 'Cannot join a finished debate' });
    }

    const debaterCount = debate.participants.filter(p => p.role === 'DEBATER').length;

    if (role === 'DEBATER') {
      if (debate.status === 'ONGOING') {
        return res.status(400).json({ message: 'Cannot join as debater in an ongoing debate' });
      }
      if (debaterCount >= 2) {
        return res.status(400).json({ message: 'Maximum number of debaters reached' });
      }
    }

    const existingParticipant = debate.participants.find(p => p.userId === req.user.id);
    if (existingParticipant) {
      return res.status(400).json({ message: 'Already participating in this debate' });
    }

    // Create the participant
    const participant = await prisma.debateParticipant.create({
      data: {
        userId: req.user.id,
        debateId: parseInt(id),
        role
      },
      include: {
        user: true
      }
    });

    // Update debate status if second debater joins
    let updatedDebate;
    if (role === 'DEBATER' && debaterCount === 1) {
      updatedDebate = await prisma.debate.update({
        where: { id: parseInt(id) },
        data: {
          status: 'ONGOING'
        },
        include: {
          participants: {
            include: {
              user: true
            }
          },
          category: true
        }
      });
    } else {
      updatedDebate = await prisma.debate.findUnique({
        where: { id: parseInt(id) },
        include: {
          participants: {
            include: {
              user: true
            }
          },
          category: true
        }
      });
    }

    // Emit real-time events
    req.app.get('io').emit('participantJoined', {
      debateId: parseInt(id),
      participant
    });

    if (role === 'DEBATER' && debaterCount === 1) {
      req.app.get('io').emit('debateStatusUpdated', {
        debateId: parseInt(id),
        status: 'ONGOING',
        debate: updatedDebate
      });
    }

    res.json({ debate: updatedDebate });
  } catch (error) {
    console.error('Error joining debate:', error);
    res.status(500).json({ 
      message: 'Failed to join debate',
      error: error.message
    });
  }
}

// Vote on a debater
async function voteOnDebater(req, res) {
  try {
    const { id } = req.params;
    const { participantId, vote, messageId } = req.body;

    if (!participantId || vote === undefined || !messageId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate vote value
    if (vote !== 1 && vote !== -1) {
      return res.status(400).json({ message: 'Invalid vote value. Must be 1 (up) or -1 (down)' });
    }

    const debate = await prisma.debate.findUnique({
      where: { id: parseInt(id) },
      include: {
        participants: {
          include: {
            user: true,
            votesReceived: true,
            votesGiven: true
          }
        }
      }
    });

    if (!debate) {
      return res.status(404).json({ message: 'Debate not found' });
    }

    const voter = debate.participants.find(p => p.userId === req.user.id);
    if (!voter || voter.role !== 'AUDIENCE') {
      return res.status(403).json({ message: 'Only audience members can vote' });
    }

    const targetParticipant = debate.participants.find(p => p.id === parseInt(participantId));
    if (!targetParticipant || targetParticipant.role !== 'DEBATER') {
      return res.status(400).json({ message: 'Invalid debater' });
    }

    // Check if user has already voted on this message
    const existingVote = await prisma.vote.findFirst({
      where: {
        voterId: voter.id,
        participantId: parseInt(participantId),
        messageId: parseInt(messageId)
      }
    });

    if (existingVote) {
      return res.status(400).json({ message: 'You have already voted on this message' });
    }

    // Create vote
    const voteRecord = await prisma.vote.create({
      data: {
        voterId: voter.id,
        participantId: parseInt(participantId),
        messageId: parseInt(messageId),
        value: vote
      }
    });

    // Get updated debate with votes
    const updatedDebate = await prisma.debate.findUnique({
      where: { id: parseInt(id) },
      include: {
        participants: {
          include: {
            user: true,
            votesReceived: true,
            votesGiven: true
          }
        },
        category: true
      }
    });

    // Emit real-time event
    req.app.get('io').emit('voteUpdated', {
      debateId: parseInt(id),
      participantId: parseInt(participantId),
      vote: voteRecord
    });

    res.json({ debate: updatedDebate });
  } catch (error) {
    console.error('Error voting on debater:', error);
    res.status(500).json({ message: 'Failed to vote on debater', error: error.message });
  }
}

// Send a debate message
async function sendMessage(req, res) {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const debate = await prisma.debate.findUnique({
      where: { id: parseInt(id) },
      include: {
        participants: true
      }
    });

    if (!debate) {
      return res.status(404).json({ message: 'Debate not found' });
    }

    const participant = debate.participants.find(p => p.userId === req.user.id);
    if (!participant) {
      return res.status(403).json({ message: 'Not a participant in this debate' });
    }

    if (participant.role === 'DEBATER' && debate.status !== 'ONGOING') {
      return res.status(400).json({ message: 'Can only send messages in ongoing debates' });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        debateId: parseInt(id),
        userId: req.user.id
      },
      include: {
        user: true
      }
    });

    req.app.get('io').emit('newMessage', {
      debateId: parseInt(id),
      message: comment
    });

    res.json({ message: comment });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Failed to send message', error: error.message });
  }
}

// Get debates created by or participated in by the current user
async function getMyDebates(req, res) {
  try {
    const { search, status } = req.query;
    const where = {
      participants: {
        some: {
          userId: req.user.id,
          role: 'DEBATER'  // Only get debates where user was a debater
        }
      }
    };

    if (search) {
      where.OR = [
        { topic: { contains: search } },
        { description: { contains: search } }
      ];
    }

    if (status) {
      where.status = status;
    }

    const debates = await prisma.debate.findMany({
      where,
      include: {
        participants: {
          include: {
            user: true,
            votesReceived: true,
            votesGiven: true
          }
        },
        category: true,
        creator: true,
        results: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ debates });
  } catch (error) {
    console.error('Error fetching my debates:', error);
    res.status(500).json({ message: 'Failed to fetch my debates' });
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

// Analyze debate results
async function analyzeDebateResults(debate, results) {
  try {
    if (!debate || !debate.comments) {
      console.error('Invalid debate data for analysis');
      return null;
    }

    // Get AI analysis
    const aiAnalysis = await analyzeDebate(debate, results);
    
    if (!aiAnalysis) {
      // Fallback to basic analysis if AI fails
      return {
        overallAssessment: {
          debateQuality: Number((Math.min(10, Math.max(1, (results.reduce((sum, r) => sum + r.messages, 0) * 0.5) + (results.reduce((sum, r) => sum + r.upvotes - r.downvotes, 0) * 0.3))).toFixed(1))),
          engagementLevel: Number((Math.min(10, Math.max(1, results.reduce((sum, r) => sum + r.messages, 0) * 0.4))).toFixed(1)),
          topicCoverage: Number((Math.min(10, Math.max(1, (results.reduce((sum, r) => sum + r.messages, 0) * 0.5) + (results.reduce((sum, r) => sum + r.upvotes - r.downvotes, 0) * 0.3))).toFixed(1))),
        },
        debaterAnalysis: results.map(debater => ({
          userId: debater.userId,
          name: debater.name,
          metrics: {
            argumentStrength: Number((Math.min(10, Math.max(1, (debater.upvotes * 2) - debater.downvotes))).toFixed(1)),
            evidenceUsage: Number((Math.min(10, Math.max(1, debater.messages * 0.5))).toFixed(1)),
            rhetoricalSkills: Number((Math.min(10, Math.max(1, (debater.upvotes * 1.5) - (debater.downvotes * 0.5)))).toFixed(1)),
            engagementLevel: Number((Math.min(10, Math.max(1, debater.messages * 2))).toFixed(1)),
          },
        })),
        finalVerdict: {
          winner: results.reduce((prev, current) => 
            (current.upvotes - current.downvotes) > (prev.upvotes - prev.downvotes) ? current : prev
          ).name,
          justification: `Won based on vote differential and message count and argument strength`
        }
      };
    }

    return {
      ...aiAnalysis,
      overallAssessment: Object.fromEntries(
        Object.entries(aiAnalysis.overallAssessment).map(([key, value]) => [key, Number(value.toFixed(1))])
      ),
      debaterAnalysis: results.map(debater => ({
        userId: debater.userId,
        name: debater.name,
        metrics: {
          argumentStrength: Number((Math.min(10, Math.max(1, (debater.upvotes * 2) - debater.downvotes))).toFixed(1)),
          evidenceUsage: Number((Math.min(10, Math.max(1, debater.messages * 0.5))).toFixed(1)),
          rhetoricalSkills: Number((Math.min(10, Math.max(1, (debater.upvotes * 1.5) - (debater.downvotes * 0.5)))).toFixed(1)),
          engagementLevel: Number((Math.min(10, Math.max(1, debater.messages * 2))).toFixed(1))
        }
      }))
    };
  } catch (error) {
    console.error('Error analyzing debate results:', error);
    return null;
  }
}

// End debate and calculate results
async function endDebate(req, res) {
  try {
    const { id } = req.params;
    
    // Get debate with all necessary data
    const debate = await prisma.debate.findUnique({
      where: { id: parseInt(id) },
      include: {
        participants: {
          include: {
            user: true,
            votesReceived: true,
            votesGiven: true
          }
        },
        comments: {
          include: {
            user: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        category: true
      }
    });

    if (!debate) {
      return res.status(404).json({ message: 'Debate not found' });
    }

    if (debate.status !== 'ONGOING') {
      return res.status(400).json({ message: 'Debate is not ongoing' });
    }

    // Calculate results
    const debaters = debate.participants.filter(p => p.role === 'DEBATER');
    const results = debaters.map(debater => {
      const upvotes = debater.votesReceived.filter(v => v.value === 1).length;
      const downvotes = debater.votesReceived.filter(v => v.value === -1).length;
      const totalVotes = upvotes - downvotes;
      
      return {
        userId: debater.userId,
        name: debater.user.name,
        upvotes,
        downvotes,
        totalVotes,
        messages: debate.comments.filter(c => c.userId === debater.userId).length
      };
    });

    // Get AI analysis
    const aiAnalysis = await analyzeDebateResults(debate, results);

    // Prepare results data
    const resultsData = {
      winnerId: results.reduce((prev, current) => 
        (current.totalVotes > prev.totalVotes) ? current : prev
      ).userId,
      scores: results,
      aiAnalysis
    };

    // Update debate status and store results
    const updatedDebate = await prisma.debate.update({
      where: { id: parseInt(id) },
      data: {
        status: 'FINISHED',
        results: resultsData
      },
      include: {
        participants: {
          include: {
            user: true,
            votesReceived: true,
            votesGiven: true
          }
        },
        category: true
      }
    });

    // Emit real-time event
    req.app.get('io').emit('debateEnded', {
      debateId: parseInt(id),
      debate: updatedDebate,
      results: resultsData
    });

    res.json({ 
      debate: updatedDebate,
      results: resultsData
    });
  } catch (error) {
    console.error('Error ending debate:', error);
    res.status(500).json({ 
      message: 'Failed to end debate',
      error: error.message
    });
  }
}

// Get user's debate statistics
async function getUserDebateStats(req, res) {
  try {
    const userId = req.user.id;

    const debates = await prisma.debateParticipant.findMany({
      where: {
        userId,
        role: 'DEBATER',
        debate: {
          status: 'FINISHED'
        }
      },
      include: {
        debate: {
          include: {
            results: true
          }
        }
      }
    });

    const stats = {
      totalDebates: debates.length,
      wins: debates.filter(d => d.debate.results?.winnerId === userId).length,
      losses: debates.filter(d => d.debate.results?.winnerId !== userId).length,
      totalVotes: debates.reduce((sum, d) => {
        const upvotes = d.votes.filter(v => v.value === 1).length;
        const downvotes = d.votes.filter(v => v.value === -1).length;
        return sum + (upvotes - downvotes);
      }, 0)
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching user debate stats:', error);
    res.status(500).json({ 
      message: 'Failed to fetch debate statistics',
      error: error.message
    });
  }
}

// Start debate timer
async function startDebateTimer(req, res) {
  try {
    const { id } = req.params;
    const debate = await prisma.debate.findUnique({
      where: { id: parseInt(id) },
      include: {
        participants: {
          include: {
            user: true
          }
        }
      }
    });

    if (!debate) {
      return res.status(404).json({ message: 'Debate not found' });
    }

    if (debate.status !== 'WAITING') {
      return res.status(400).json({ message: 'Debate is not in waiting state' });
    }

    const debaterCount = debate.participants.filter(p => p.role === 'DEBATER').length;
    if (debaterCount < 2) {
      return res.status(400).json({ message: 'Need two debaters to start' });
    }

    const startTime = new Date();
    const duration = 3; // 3 minutes in minutes

    const updatedDebate = await prisma.debate.update({
      where: { id: parseInt(id) },
      data: {
        status: 'ONGOING',
        startTime,
        duration
      },
      include: {
        participants: {
          include: {
            user: true
          }
        },
        category: true
      }
    });

    // Emit real-time event
    req.app.get('io').emit('debateStarted', {
      debateId: parseInt(id),
      debate: updatedDebate,
      startTime,
      duration
    });

    // Set timeout to end debate after duration
    setTimeout(async () => {
      try {
        await endDebate(req, res);
      } catch (error) {
        console.error('Error auto-ending debate:', error);
      }
    }, duration * 60 * 1000);

    res.json({ debate: updatedDebate });
  } catch (error) {
    console.error('Error starting debate timer:', error);
    res.status(500).json({ 
      message: 'Failed to start debate timer',
      error: error.message
    });
  }
}

// Request debate results
async function requestResults(req, res) {
  try {
    const { id } = req.params;
    const debate = await prisma.debate.findUnique({
      where: { id: parseInt(id) },
      include: {
        participants: {
          include: {
            user: true
          }
        }
      }
    });

    if (!debate) {
      return res.status(404).json({ message: 'Debate not found' });
    }

    if (debate.status !== 'ONGOING') {
      return res.status(400).json({ message: 'Debate is not ongoing' });
    }

    const participant = debate.participants.find(p => p.userId === req.user.id);
    if (!participant || participant.role !== 'DEBATER') {
      return res.status(403).json({ message: 'Only debaters can request results' });
    }

    // Update the participant's result request status
    const updatedParticipant = await prisma.debateParticipant.update({
      where: { id: participant.id },
      data: { hasRequestedResults: true },
      include: { user: true }
    });

    // Check if all debaters have requested results
    const debaters = debate.participants.filter(p => p.role === 'DEBATER');
    const allDebatersRequested = debaters.every(d => d.hasRequestedResults);

    // If all debaters have requested results, end the debate
    if (allDebatersRequested) {
      await endDebate(req, res);
      return;
    }

    // Emit real-time event
    req.app.get('io').emit('resultRequested', {
      debateId: parseInt(id),
      participant: updatedParticipant,
      allDebatersRequested
    });

    res.json({ 
      participant: updatedParticipant,
      allDebatersRequested
    });
  } catch (error) {
    console.error('Error requesting results:', error);
    res.status(500).json({ 
      message: 'Failed to request results',
      error: error.message
    });
  }
}

module.exports = {
  createDebate,
  getDebates,
  getDebate,
  joinDebate,
  voteOnDebater,
  sendMessage,
  getMyDebates,
  getDebateStats,
  endDebate,
  getUserDebateStats,
  startDebateTimer,
  analyzeDebateResults,
  requestResults
};
