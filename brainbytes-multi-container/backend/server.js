const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const aiService = require('./aiService.js');

const client = require('prom-client');
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestCounter = new client.Counter({
  name: 'brainbytes_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

const activeSessionsGauge = new client.Gauge({
  name: 'brainbytes_active_sessions',
  help: 'Number of currently active chat sessions',
  registers: [register],
});

const aiResponseDuration = new client.Histogram({
  name: 'brainbytes_ai_response_duration_seconds',
  help: 'Duration of AI response generation in seconds',
  labelNames: ['subject'],
  buckets: [0.5, 1, 2, 5, 10, 15],
  registers: [register],
});

const responseSizeBytes = new client.Counter({
  name: 'brainbytes_response_bytes_total',
  help: 'Total bytes sent in API responses (data usage tracking)',
  labelNames: ['route'],
  registers: [register],
});

const timeoutCounter = new client.Counter({
  name: 'brainbytes_request_timeouts_total',
  help: 'Total requests that timed out (proxy for intermittent connectivity)',
  labelNames: ['subject'],
  registers: [register],
});

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:7000', 'http://localhost:3000'];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
  })
);
app.use(express.json());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const mutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

app.use((req, res, next) => {
  res.on('finish', () => {
    httpRequestCounter.inc({ method: req.method, route: req.path, status: res.statusCode });
    const size = parseInt(res.getHeader('content-length')) || 0;
    responseSizeBytes.inc({ route: req.path }, size);
  });
  next();
});

aiService.initializeAI();

const mongoUrl = process.env.MONGO_URL || 'mongodb://mongo:27017/brainbytes';

mongoose
  .connect(mongoUrl)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
  });

const Message = require('./models/Message');
const UserProfile = require('./models/UserProfile');
const LearningMaterial = require('./models/LearningMaterial');

// Welcome
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the BrainBytes API' });
});

// Health check
app.get('/health', async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    status: dbState === 1 ? 'healthy' : 'degraded',
    database: dbStatus[dbState] || 'unknown',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Get messages
app.get('/api/messages', apiLimiter, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const chatId = req.query.chatId;
    const username = req.query.username;

    if (chatId && typeof chatId !== 'string') {
      return res.status(400).json({ error: 'Invalid chatId parameter' });
    }
    if (username && typeof username !== 'string') {
      return res.status(400).json({ error: 'Invalid username parameter' });
    }

    const filter = {};
    if (chatId) filter.chatId = { $eq: chatId };
    if (username) filter.username = { $eq: username };

    const messages = await Message.find(filter).sort({ createdAt: 1 }).limit(limit);

    res.json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: err.message });
  }
});

// Send message and get AI response
app.post('/api/messages', mutationLimiter, async (req, res) => {
  activeSessionsGauge.inc();
  try {
    const text = (req.body.text || '').trim();
    const subject = (req.body.subject || 'general').toLowerCase();
    const preferredSubjects = req.body.preferredSubjects || [];
    const chatId = req.body.chatId || `chat_${subject}_${Date.now()}`;
    const username = (req.body.username || '').trim();

    if (!text) {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    const userMessage = new Message({
      text,
      isUser: true,
      subject,
      category: subject,
      chatId,
      username,
    });
    await userMessage.save();

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 15000);
    });

    const aiTimer = aiResponseDuration.startTimer({ subject });

    const aiResult = await Promise.race([
      aiService.generateResponse(text, { subject, filter: preferredSubjects }),
      timeoutPromise,
    ]).catch(() => {
      timeoutCounter.inc({ subject });
      return {
        category: subject,
        subject,
        questionType: 'general',
        sentiment: 'neutral',
        response:
          "I'm sorry, I couldn't process your request in time. Please try again with a shorter question.",
      };
    });

    aiTimer();

    // const aiResult = await Promise.race([
    //   aiService.generateResponse(text, { subject, filter: preferredSubjects }),
    //   timeoutPromise
    // ]).catch(() => ({
    //   category: subject,
    //   subject,
    //   questionType: 'general',
    //   sentiment: 'neutral',
    //   response: "I'm sorry, I couldn't process your request in time. Please try again with a shorter question."
    // }));

    const aiMessage = new Message({
      text: aiResult.response,
      isUser: false,
      subject: aiResult.subject || subject,
      questionType: aiResult.questionType || 'general',
      sentiment: aiResult.sentiment || 'neutral',
      category: aiResult.category || subject,
      chatId,
      username,
    });
    await aiMessage.save();

    res.status(201).json({
      userMessage,
      aiMessage,
      category: aiResult.category,
      questionType: aiResult.questionType,
      sentiment: aiResult.sentiment,
      chatId,
    });
  } catch (err) {
    console.error('Error in /api/messages route:', err);
    console.error('Full error object:', err);
    console.error('Error stack:', err.stack);
    res.status(400).json({ error: err.message });
  } finally {
    activeSessionsGauge.dec();
  }
});

// Create profile
app.post('/api/profiles', mutationLimiter, async (req, res) => {
  try {
    const profile = new UserProfile(req.body);
    await profile.save();
    res.status(201).json(profile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get profiles
app.get('/api/profiles', apiLimiter, async (req, res) => {
  try {
    const { subjects } = req.query;
    let filter = {};
    if (subjects) {
      filter.preferredSubjects = { $in: subjects.split(',') };
    }
    const profiles = await UserProfile.find(filter);
    res.json(profiles);
  } catch (err) {
    console.error('Error fetching profiles:', err);
    console.error('Full error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get profile by ID
app.get('/api/profiles/:id', apiLimiter, async (req, res) => {
  try {
    const profile = await UserProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(profile);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(400).json({ error: err.message });
  }
});

// Update profile
app.put('/api/profiles/:id', mutationLimiter, async (req, res) => {
  try {
    const allowedFields = ['name', 'email', 'preferredSubjects'];
    const sanitizedBody = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'preferredSubjects') {
          if (!Array.isArray(req.body[field])) {
            return res.status(400).json({ error: 'Invalid preferredSubjects format' });
          }
          sanitizedBody[field] = req.body[field].filter((item) => typeof item === 'string');
        } else if (typeof req.body[field] !== 'string') {
          return res.status(400).json({ error: `Invalid type for ${field}` });
        } else {
          sanitizedBody[field] = req.body[field];
        }
      }
    }
    const profile = await UserProfile.findByIdAndUpdate(req.params.id, { $set: sanitizedBody }, {
      new: true,
      runValidators: true,
    });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(profile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete profile
app.delete('/api/profiles/:id', mutationLimiter, async (req, res) => {
  try {
    const profile = await UserProfile.findByIdAndDelete(req.params.id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json({ message: 'Profile deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Create material
app.post('/api/materials', mutationLimiter, async (req, res) => {
  try {
    const material = new LearningMaterial(req.body);
    await material.save();
    res.status(201).json(material);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get materials
app.get('/api/materials', apiLimiter, async (req, res) => {
  try {
    const filter = {};
    if (req.query.subject) {
      filter.subject = req.query.subject.toLowerCase();
    }
    if (req.query.topic) {
      filter.topic = { $regex: req.query.topic, $options: 'i' };
    }
    const materials = await LearningMaterial.find(filter).sort({ createdAt: -1 });
    res.json(materials);
  } catch (err) {
    console.error('Full error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get material by ID
app.get('/api/materials/:id', apiLimiter, async (req, res) => {
  try {
    const material = await LearningMaterial.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }
    res.json(material);
  } catch (err) {
    console.error('Error fetching material:', err);
    res.status(400).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
