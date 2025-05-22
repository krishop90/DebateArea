const { HfInference } = require('@huggingface/inference');

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Analyze debate using Hugging Face
const analyzeDebate = async (debate, results) => {
  try {
    // Get messages from debaters
    const debaterMessages = debate.comments
      .filter(comment => debate.participants.some(p => p.userId === comment.userId && p.role === 'DEBATER'))
      .map(comment => ({
        userId: comment.userId,
        name: comment.user.name,
        content: comment.content
      }));

    // Group messages by debater
    const messagesByDebater = {};
    debaterMessages.forEach(msg => {
      if (!messagesByDebater[msg.userId]) {
        messagesByDebater[msg.userId] = [];
      }
      messagesByDebater[msg.userId].push(msg.content);
    });

    // Calculate basic metrics
    const debaterMetrics = results.map(debater => {
      const messages = messagesByDebater[debater.userId] || [];
      const avgMessageLength = messages.reduce((sum, msg) => sum + msg.length, 0) / (messages.length || 1);
      
      return {
        userId: debater.userId,
        name: debater.name,
        metrics: {
          argumentQuality: Math.min(10, Math.max(1, (debater.upvotes * 2) - debater.downvotes)),
          communicationSkills: Math.min(10, Math.max(1, avgMessageLength / 50)),
          topicCoverage: Math.min(10, Math.max(1, messages.length * 0.5)),
          strengths: [
            debater.upvotes > debater.downvotes ? 'Strong audience support' : null,
            messages.length > 5 ? 'Active participation' : null,
            avgMessageLength > 100 ? 'Detailed arguments' : null
          ].filter(Boolean),
          weaknesses: [
            debater.downvotes > debater.upvotes ? 'Needs to improve argument presentation' : null,
            messages.length < 3 ? 'Limited participation' : null,
            avgMessageLength < 50 ? 'Arguments could be more detailed' : null
          ].filter(Boolean)
        }
      };
    });

    // Determine winner based on metrics
    const winner = debaterMetrics.reduce((prev, current) => {
      const prevScore = prev.metrics.argumentQuality + prev.metrics.communicationSkills + prev.metrics.topicCoverage;
      const currentScore = current.metrics.argumentQuality + current.metrics.communicationSkills + current.metrics.topicCoverage;
      return currentScore > prevScore ? current : prev;
    });

    return {
      overallAssessment: {
        debateQuality: Math.min(10, Math.max(1, results.reduce((sum, r) => sum + r.messages, 0) * 0.5)),
        engagementLevel: Math.min(10, Math.max(1, results.reduce((sum, r) => sum + r.messages, 0) * 0.4)),
        topicCoverage: Math.min(10, Math.max(1, results.reduce((sum, r) => sum + r.messages, 0) * 0.5))
      },
      debaterAnalysis: debaterMetrics,
      winner: {
        name: winner.name,
        justification: `Won based on argument quality, communication skills, and topic coverage`
      },
      keyArguments: Object.values(messagesByDebater)
        .flat()
        .slice(0, 3)
        .map(msg => msg.substring(0, 100) + '...'),
      improvements: [
        'Consider providing more detailed arguments',
        'Engage more with audience feedback',
        'Maintain consistent participation throughout the debate'
      ]
    };
  } catch (error) {
    console.error('Error analyzing debate:', error);
    return null;
  }
};

module.exports = {
  analyzeDebate
}; 