const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const aiService = require('./aiService.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize AI model
aiService.initializeAI();

// Connect to MongoDB
mongoose.connect('mongodb://mongo:27017/brainbytes', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  retryWrites: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('Failed to connect to MongoDB:', err);
});

// Import schema models
const Message = require('./models/Message');
const UserProfile = require('./models/UserProfile');
const LearningMaterial = require('./models/LearningMaterial');

// API Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the BrainBytes API' });
});

// Get all messages
app.get('/api/messages', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const messages = await Message.find().sort({ createdAt: -1 }).limit(limit);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new message and get AI response
app.post('/api/messages', async (req, res) => {
  try {
    // Save user message
    const text = (req.body.text || '').trim();
    const subject = (req.body.subject || 'general').toLowerCase();

    if (!text) {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    const userMessage = new Message({
      text,
      isUser: true,
      subject,
      category: subject
    });
    await userMessage.save();

    // Generate AI response with a 15-second overall timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 15000);
    });

    // Race between the AI response and the timeout
    const aiResult = await Promise.race([
      aiService.generateResponse(text, { subject }),
      timeoutPromise
    ]).catch(() => ({
      category: subject,
      subject,
      questionType: 'general',
      sentiment: 'neutral',
      response: "I'm sorry, I couldn't process your request in time. Please try again with a shorter question."
    }));

    const aiMessage = new Message({
      text: aiResult.response,
      isUser: false,
      subject: aiResult.subject || subject,
      questionType: aiResult.questionType || 'general',
      sentiment: aiResult.sentiment || 'neutral',
      category: aiResult.category || subject
    });
    await aiMessage.save();

    // Return both messages
    res.status(201).json({
      userMessage,
      aiMessage,
      category: aiResult.category,
      questionType: aiResult.questionType,
      sentiment: aiResult.sentiment
    });
  } catch (err) {
    console.error('Error in /api/messages route:', err);
    res.status(400).json({ error: err.message });
  }
});

// Create Profile
app.post('/api/profiles', async (req, res) => {
  try {
    const profile = new UserProfile(req.body);
    await profile.save();
    res.status(201).json(profile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get Profiles
app.get('/api/profiles', async (req, res) => {
  try {
    const profiles = await UserProfile.find().sort({ createdAt: -1 });
    res.json(profiles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Profile
app.get('/api/profiles/:id', async (req, res) => {
  try {
    const profile = await UserProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(profile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/profiles/:id', async (req, res) => {
  try {
    const profile = await UserProfile.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(profile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Profile
app.delete('/api/profiles/:id', async (req, res) => {
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

// Create Material
app.post('/api/materials', async (req, res) => {
  try {
    const material = new LearningMaterial(req.body);
    await material.save();
    res.status(201).json(material);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get Materials (filter by subject)
app.get('/api/materials', async (req, res) => {
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
    res.status(500).json({ error: err.message });
  }
});

// Get Material
app.get('/api/materials/:id', async (req, res) => {
  try {
    const material = await LearningMaterial.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }
    res.json(material);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
