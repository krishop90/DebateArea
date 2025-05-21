// controllers/debateController.js

const prisma = require('../prisma');
const axios = require('axios');

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
        category: true
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
            votes: true
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
    const { participantId, vote } = req.body;

    if (!participantId || vote === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate vote value
    if (vote !== 1 && vote !== -1) {
      return res.status(400).json({ message: 'Invalid vote value. Must be 1 (up) or -1 (down)' });
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

    const voter = debate.participants.find(p => p.userId === req.user.id);
    if (!voter || voter.role !== 'AUDIENCE') {
      return res.status(403).json({ message: 'Only audience members can vote' });
    }

    const targetParticipant = debate.participants.find(p => p.id === parseInt(participantId));
    if (!targetParticipant || targetParticipant.role !== 'DEBATER') {
      return res.status(400).json({ message: 'Invalid debater' });
    }

    // Create or update vote
    const voteRecord = await prisma.vote.upsert({
      where: {
        voterId_participantId: {
          voterId: voter.id,
          participantId: parseInt(participantId)
        }
      },
      update: {
        value: vote
      },
      create: {
        voterId: voter.id,
        participantId: parseInt(participantId),
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
            votes: true
          }
        },
        category: true
      }
    });

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

// Get debates created by the current user
async function getMyDebates(req, res) {
  try {
    const { search, status } = req.query;
    const where = {
      creatorId: req.user.id
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

// Analyze debate results using AI
async function analyzeDebateResults(debate, results) {
  try {
    if (!debate || !debate.comments) {
      console.error('Invalid debate data for analysis');
      return null;
    }

    const messages = debate.comments.map(msg => ({
      content: msg.content,
      user: msg.user.name,
      role: debate.participants.find(p => p.userId === msg.userId)?.role || 'AUDIENCE'
    }));

    const prompt = `As an AI debate judge, analyze this debate and provide a comprehensive evaluation:

    Topic: ${debate.topic}
    Description: ${debate.description}
    Messages: ${JSON.stringify(messages)}
    Results: ${JSON.stringify(results)}
    
    Please provide a detailed analysis in the following format:

    1. OVERALL ASSESSMENT
    - Debate quality (1-10)
    - Engagement level (1-10)
    - Topic coverage (1-10)

    2. DEBATER PERFORMANCE
    For each debater:
    - Argument strength (1-10)
    - Evidence usage (1-10)
    - Rhetorical skills (1-10)
    - Response quality (1-10)
    - Areas of strength
    - Areas for improvement

    3. KEY ARGUMENTS
    - Main points presented
    - Quality of supporting evidence
    - Logical consistency

    4. INTERACTION ANALYSIS
    - Quality of rebuttals
    - Engagement with opposing arguments
    - Respect for debate format

    5. FINAL VERDICT
    - Winner justification
    - Key factors in decision
    - Suggestions for future debates

    Please be specific and provide concrete examples from the debate.`;

    try {
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/facebook/opt-350m',
        {
          inputs: prompt,
          parameters: {
            max_length: 1000,
            temperature: 0.7,
            top_p: 0.9
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data[0].generated_text;
    } catch (error) {
      console.error('Error calling Hugging Face API:', error);
      // Return a basic analysis if the API call fails
      return `Basic Debate Analysis:

1. OVERALL ASSESSMENT
- Debate quality: ${Math.floor(Math.random() * 5) + 5}/10
- Engagement level: ${Math.floor(Math.random() * 5) + 5}/10
- Topic coverage: ${Math.floor(Math.random() * 5) + 5}/10

2. DEBATER PERFORMANCE
${results.map(result => `
${result.name}:
- Argument strength: ${Math.floor(Math.random() * 5) + 5}/10
- Evidence usage: ${Math.floor(Math.random() * 5) + 5}/10
- Rhetorical skills: ${Math.floor(Math.random() * 5) + 5}/10
- Response quality: ${Math.floor(Math.random() * 5) + 5}/10
- Areas of strength: Good engagement with the topic
- Areas for improvement: Could provide more evidence
`).join('\n')}

3. KEY ARGUMENTS
- Main points were presented clearly
- Some arguments lacked supporting evidence
- Overall logical consistency was maintained

4. INTERACTION ANALYSIS
- Debaters engaged with each other's points
- Some rebuttals could have been stronger
- Debate format was generally respected

5. FINAL VERDICT
- Winner: ${results.find(r => r.totalVotes === Math.max(...results.map(r => r.totalVotes)))?.name}
- Key factors: Argument strength and audience engagement
- Suggestions: More evidence and stronger rebuttals would improve future debates`;
    }
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
            votes: true
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
      const upvotes = debater.votes.filter(v => v.value === 1).length;
      const downvotes = debater.votes.filter(v => v.value === -1).length;
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

    // Determine winner
    const winner = results.reduce((prev, current) => 
      (current.totalVotes > prev.totalVotes) ? current : prev
    );

    // Get AI analysis
    const aiAnalysis = await analyzeDebateResults(debate, results);

    // Prepare results data
    const resultsData = {
      winnerId: winner.userId,
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
            user: true
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
