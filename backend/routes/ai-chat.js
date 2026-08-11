const express = require('express');
const router = express.Router();
const { ChatMessage, Tender, Contractor, User } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const auditLogger = require('../utils/auditLogger');

// POST /api/ai-chat/send - Send a message to AI assistant
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { sessionId, message, context } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ error: 'Session ID and message are required' });
    }

    // Save user message
    const userMessage = await ChatMessage.create({
      sessionId,
      userId: req.user.id,
      role: 'user',
      content: message,
      context: context || {}
    });

    // Generate AI response based on context and message
    const aiResponse = await generateAIResponse(message, context, req.user);

    // Save AI response
    const assistantMessage = await ChatMessage.create({
      sessionId,
      userId: req.user.id,
      role: 'assistant',
      content: aiResponse.content,
      context: aiResponse.context || {},
      metadata: aiResponse.metadata || {}
    });

    await auditLogger.log({
      userId: req.user.id,
      action: 'AI_CHAT_INTERACTION',
      entityType: 'chat_message',
      entityId: sessionId,
      details: { sessionId, message: message.substring(0, 100) },
      req
    });

    res.json({
      userMessage,
      assistantMessage,
      aiResponse: aiResponse.content
    });
  } catch (error) {
    console.error('AI Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat message', details: error.message });
  }
});

// GET /api/ai-chat/history/:sessionId - Get chat history for a session
router.get('/history/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 50 } = req.query;

    const messages = await ChatMessage.findAll({
      where: { sessionId },
      order: [['createdAt', 'ASC']],
      limit: parseInt(limit),
      include: [{
        model: User,
        attributes: ['id', 'email', 'role']
      }]
    });

    res.json({ messages });
  } catch (error) {
    console.error('Fetch chat history error:', error);
    res.status(500).json({ error: 'Failed to fetch chat history', details: error.message });
  }
});

// DELETE /api/ai-chat/session/:sessionId - Clear a chat session
router.delete('/session/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    await ChatMessage.destroy({
      where: { 
        sessionId,
        userId: req.user.id 
      }
    });

    await auditLogger.log({
      userId: req.user.id,
      action: 'AI_CHAT_SESSION_CLEARED',
      entityType: 'chat_message',
      entityId: sessionId,
      details: { sessionId },
      req
    });

    res.json({ message: 'Chat session cleared successfully' });
  } catch (error) {
    console.error('Clear chat session error:', error);
    res.status(500).json({ error: 'Failed to clear chat session', details: error.message });
  }
});

// POST /api/ai-chat/recommend-tenders - Get AI tender recommendations
router.post('/recommend-tenders', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'contractor') {
      return res.status(403).json({ error: 'Only contractors can get tender recommendations' });
    }

    const contractor = await Contractor.findOne({
      where: { userId: req.user.id }
    });

    if (!contractor) {
      return res.status(404).json({ error: 'Contractor profile not found' });
    }

    // Get all published tenders
    const tenders = await Tender.findAll({
      where: { status: 'published' }
    });

    // AI-based scoring for tender recommendations
    const recommendations = tenders.map(tender => {
      const score = calculateTenderScore(tender, contractor);
      return {
        tender,
        score,
        reason: generateRecommendationReason(tender, contractor, score)
      };
    }).sort((a, b) => b.score - a.score).slice(0, 5); // Top 5 recommendations

    await auditLogger.log({
      userId: req.user.id,
      action: 'AI_TENDER_RECOMMENDATION_REQUESTED',
      entityType: 'contractor',
      entityId: contractor.id,
      details: {
        contractorId: contractor.id,
        recommendedCount: recommendations.length
      },
      req
    });

    res.json({ recommendations });
  } catch (error) {
    console.error('Tender recommendation error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations', details: error.message });
  }
});

// Helper: Generate AI response (Mock implementation - replace with real AI integration)
async function generateAIResponse(message, context, user) {
  const lowerMessage = message.toLowerCase();

  // Tender-related queries
  if (lowerMessage.includes('tender') || lowerMessage.includes('bid')) {
    if (lowerMessage.includes('how to') || lowerMessage.includes('apply') || lowerMessage.includes('submit')) {
      return {
        content: `To apply for a tender:\n\n1. **Find Tenders**: Browse available tenders in the dashboard\n2. **Review Details**: Check eligibility criteria, budget, and deadline\n3. **Prepare Bid**: Create your technical proposal and pricing\n4. **Upload Documents**: Attach required certificates and company documents\n5. **Submit Bid**: Click 'Submit Bid' before the deadline\n\nYour contractor verification status must be 'verified' to submit bids. Would you like help with a specific tender?`,
        context: { topic: 'tender_application_guide' },
        metadata: { responseType: 'guide' }
      };
    }
    
    if (lowerMessage.includes('eligibility') || lowerMessage.includes('qualify')) {
      return {
        content: `**Tender Eligibility Requirements:**\n\n✅ **Verified Contractor Account**: Your company must be verified\n✅ **Valid Licenses**: GST, PAN, and registration certificates\n✅ **Technical Capacity**: Must match tender category requirements\n✅ **Financial Capacity**: Ability to handle estimated budget\n✅ **Experience**: Previous project history (for some tenders)\n\nWhich tender are you interested in? I can check specific requirements.`,
        context: { topic: 'eligibility_criteria' },
        metadata: { responseType: 'information' }
      };
    }

    if (lowerMessage.includes('deadline') || lowerMessage.includes('closing')) {
      return {
        content: `You can find tender deadlines in the tender list. Tenders closing soon are marked with urgency indicators. Would you like me to show you tenders closing within the next 7 days?`,
        context: { topic: 'deadlines' },
        metadata: { responseType: 'query' }
      };
    }
  }

  // Document-related queries
  if (lowerMessage.includes('document') || lowerMessage.includes('certificate') || lowerMessage.includes('upload')) {
    return {
      content: `**Required Documents for Bidding:**\n\n📄 **Company Documents:**\n- GST Registration Certificate\n- PAN Card\n- Company Registration Certificate\n\n📄 **Technical Documents:**\n- Technical Proposal (PDF)\n- Work Experience Certificates\n- Equipment List (if applicable)\n\n📄 **Financial Documents:**\n- Bank Guarantee (for high-value tenders)\n- Financial Statements (for some categories)\n\nAll documents must be in PDF format, max 10MB each. Need help uploading?`,
      context: { topic: 'required_documents' },
      metadata: { responseType: 'checklist' }
    };
  }

  // Payment-related queries
  if (lowerMessage.includes('payment') || lowerMessage.includes('invoice')) {
    return {
      content: `**Payment Process:**\n\n1. **Request Payment**: Submit payment request with work completion proof\n2. **Engineer Verification**: Site engineer verifies work completion\n3. **Finance Approval**: Finance officer approves payment\n4. **Payment Released**: Amount credited within 7 working days\n\nYou can track payment status in the 'Payments' section. Need help with a pending payment?`,
      context: { topic: 'payment_process' },
      metadata: { responseType: 'workflow' }
    };
  }

  // Project-related queries
  if (lowerMessage.includes('project') || lowerMessage.includes('work')) {
    return {
      content: `I can help you with:\n\n🏗️ **Project Management**: Track ongoing projects and milestones\n📊 **Project Status**: Check progress and completion percentage\n📅 **Timeline**: View project schedules and deadlines\n👷 **Inspections**: Schedule and view inspection reports\n\nWhat specific information do you need about your projects?`,
      context: { topic: 'project_management' },
      metadata: { responseType: 'menu' }
    };
  }

  // General help
  if (lowerMessage.includes('help') || lowerMessage === 'hi' || lowerMessage === 'hello') {
    const roleSpecificHelp = user.role === 'contractor' 
      ? '\n- Find and apply for suitable tenders\n- Track your bids and projects\n- Manage payments and invoices\n- Upload documents and certificates'
      : '\n- Manage tenders and projects\n- Review contractor bids\n- Approve payments\n- Generate reports';

    return {
      content: `👋 Hello! I'm your AI Tender Assistant. I can help you with:\n\n✨ **Smart Features:**\n- Answer questions about tenders and bidding\n- Explain eligibility criteria and requirements\n- Guide you through the application process\n- Recommend suitable tenders (for contractors)${roleSpecificHelp}\n\nWhat would you like to know?`,
      context: { topic: 'welcome' },
      metadata: { responseType: 'welcome' }
    };
  }

  // Default response
  return {
    content: `I understand you're asking about "${message}". I can help with:\n\n• Tender information and applications\n• Eligibility criteria and requirements\n• Document upload guidelines\n• Payment and project tracking\n• General tender management questions\n\nCould you please provide more details about what you'd like to know?`,
    context: { topic: 'general_query', originalMessage: message },
    metadata: { responseType: 'clarification' }
  };
}

// Helper: Calculate tender recommendation score
function calculateTenderScore(tender, contractor) {
  let score = 0;

  // Category match (check if contractor's technical capacity mentions tender category)
  if (contractor.technicalCapacity && 
      contractor.technicalCapacity.toLowerCase().includes(tender.category.toLowerCase())) {
    score += 40;
  }

  // Verification status bonus
  if (contractor.verificationStatus === 'verified') {
    score += 20;
  }

  // Budget alignment (prefer tenders within reasonable range)
  const estimatedBudget = parseFloat(tender.estimatedBudget);
  if (estimatedBudget < 1000000) score += 15;
  else if (estimatedBudget < 2000000) score += 10;
  else score += 5;

  // Deadline proximity (prefer tenders with more time)
  const daysUntilDeadline = Math.ceil((new Date(tender.deadline) - new Date()) / (1000 * 60 * 60 * 24));
  if (daysUntilDeadline > 14) score += 15;
  else if (daysUntilDeadline > 7) score += 10;
  else if (daysUntilDeadline > 3) score += 5;

  // Rating bonus
  if (contractor.averageRating >= 4.5) score += 10;
  else if (contractor.averageRating >= 4.0) score += 5;

  return Math.min(score, 100); // Cap at 100
}

// Helper: Generate recommendation reason
function generateRecommendationReason(tender, contractor, score) {
  const reasons = [];

  if (contractor.technicalCapacity && 
      contractor.technicalCapacity.toLowerCase().includes(tender.category.toLowerCase())) {
    reasons.push('Matches your technical expertise in ' + tender.category);
  }

  if (contractor.verificationStatus === 'verified') {
    reasons.push('Your verified status qualifies you');
  }

  const estimatedBudget = parseFloat(tender.estimatedBudget);
  if (estimatedBudget < 1000000) {
    reasons.push('Budget aligns with your capacity');
  } else if (estimatedBudget >= 2000000) {
    reasons.push('High-value opportunity');
  }

  const daysUntilDeadline = Math.ceil((new Date(tender.deadline) - new Date()) / (1000 * 60 * 60 * 24));
  if (daysUntilDeadline > 14) {
    reasons.push('Sufficient time to prepare bid');
  } else if (daysUntilDeadline <= 7) {
    reasons.push('Deadline approaching - act fast!');
  }

  if (contractor.averageRating >= 4.5) {
    reasons.push('Your excellent rating strengthens your application');
  }

  return reasons.length > 0 ? reasons.join(' • ') : 'Suitable for your profile';
}

module.exports = router;
