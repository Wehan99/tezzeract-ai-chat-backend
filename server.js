
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'https://chat.tezzeract.lt', 'https://lovable-bot-4pxb.vercel.app'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Tezzeract AI knowledge base
const tezzeractKnowledge = `
You are a helpful AI assistant for Tezzeract AI, a company that builds smart automation systems.

COMPANY OVERVIEW:
Tezzeract AI builds smart automation systems that handle routine tasks, freeing teams to focus on growing their business.

SERVICES:
1. **AI-powered Workflow Automation**
   - Streamline business processes with intelligent automation
   - Automate repetitive tasks and integrate systems
   - Create adaptive workflows that learn and improve
   - Reduce manual work by up to 80%

2. **Agentic Automation**
   - Deploy autonomous AI agents that make decisions independently
   - Handle complex multi-step processes without human intervention
   - 24/7 operation for customer inquiries, data processing, and business logic
   - Learn from interactions and improve over time

3. **Digital Transformation powered by AI**
   - Modernize legacy systems with AI integration
   - Implement smart analytics and data-driven decision making
   - Build scalable AI infrastructure
   - Seamless integration with existing systems

4. **Generative AI powered Creative solutions**
   - Automate content creation, copywriting, and design
   - Generate personalized marketing materials and brand assets
   - Create high-quality, on-brand content at scale
   - Multimedia content generation

KEY BENEFITS:
- ROI typically achieved within 3-6 months
- 60-80% reduction in operational costs for automated processes
- 90% reduction in processing time
- Elimination of human errors
- 24/7 autonomous operation
- Scalable from startup to enterprise

PRICING:
- Startup packages: Starting at $500/month
- Mid-market solutions: $2,000-$10,000/month
- Enterprise implementations: Custom pricing
- All packages include implementation, training, and ongoing support

Be friendly, professional, and focus on understanding the customer's specific needs. Ask qualifying questions to provide tailored recommendations.
`;

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [], context = {} } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required and must be a string' });
    }

    // Prepare the conversation for Gemini
    let conversationText = tezzeractKnowledge + "\n\nConversation:\n";
    
    // Add conversation history
    history.forEach(msg => {
      conversationText += `${msg.role}: ${msg.content}\n`;
    });
    
    // Add current user message
    conversationText += `user: ${message}\nassistant: `;

    // Generate response using Gemini
    const result = await model.generateContent({
      contents: [{ parts: [{ text: conversationText }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 500,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH", 
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    });

    const responseText = result.response.text();

    // Log conversation for analytics (optional)
    console.log(`[${new Date().toISOString()}] ${context.website || 'unknown'}: ${message}`);

    res.json({
      response: responseText,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      model: 'gemini-2.0-flash-exp'
    });

  } catch (error) {
    console.error('Chat API error:', error);
    
    // Provide a helpful fallback response
    const fallbackResponse = getFallbackResponse(req.body.message);
    
    res.status(200).json({
      response: fallbackResponse,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      fallback: true
    });
  }
});

// Knowledge base upload endpoint
app.post('/api/knowledge', async (req, res) => {
  try {
    // This would typically process uploaded documents
    // and update the knowledge base in a vector database
    res.json({ 
      message: 'Knowledge base updated successfully',
      documentsProcessed: req.files?.length || 0
    });
  } catch (error) {
    console.error('Knowledge base error:', error);
    res.status(500).json({ error: 'Failed to update knowledge base' });
  }
});

// Analytics endpoint
app.get('/api/analytics', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    // This would typically query your database for analytics data
    const mockAnalytics = {
      totalConversations: 1250,
      averageResponseTime: '1.2s',
      satisfactionRate: '94%',
      topTopics: ['workflow automation', 'pricing', 'demos', 'agentic automation'],
      conversationsByDay: [
        { date: '2024-01-01', count: 45 },
        { date: '2024-01-02', count: 52 },
        // ... more data
      ]
    };
    
    res.json(mockAnalytics);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Fallback response function
function getFallbackResponse(message) {
  const input = message.toLowerCase();
  
  if (input.includes('automation') || input.includes('workflow')) {
    return "Our AI-powered workflow automation helps streamline your business processes and can reduce manual work by up to 80%. Would you like to schedule a demo to see how it works?";
  }
  
  if (input.includes('pricing') || input.includes('cost')) {
    return "Our pricing starts at $500/month for startups and scales based on your needs. I'd be happy to connect you with our team for a personalized quote. What's the size of your organization?";
  }
  
  return "I'm here to help you learn about Tezzeract AI's automation solutions. We offer workflow automation, agentic automation, digital transformation, and creative AI solutions. What specific challenges are you looking to solve?";
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Tezzeract AI Chat API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
