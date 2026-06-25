const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const aiService = require('./aiService.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

aiService.initializeAI();

const mongoUrl = process.env.MONGO_URL || 'mongodb://mongo:27017/brainbytes';

mongoose.connect(mongoUrl)
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

// Get messages
app.get('/api/messages', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const chatId = req.query.chatId;
    const username = req.query.username;

    const filter = {};
    if (chatId) filter.chatId = chatId;
    if (username) filter.username = username;

    const messages = await Message.find(filter)
      .sort({ createdAt: 1 })
      .limit(limit);

    res.json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: err.message });
  }
});

// Send message and get AI response
app.post('/api/messages', async (req, res) => {
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
      username
    });
    await userMessage.save();

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 15000);
    });

    const aiResult = await Promise.race([
      aiService.generateResponse(text, { subject, filter: preferredSubjects }),
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
      category: aiResult.category || subject,
      chatId,
      username
    });
    await aiMessage.save();

    res.status(201).json({
      userMessage,
      aiMessage,
      category: aiResult.category,
      questionType: aiResult.questionType,
      sentiment: aiResult.sentiment,
      chatId
    });
  } catch (err) {
    console.error('Error in /api/messages route:', err);
    console.error('Full error object:', err);
    console.error('Error stack:', err.stack);
    res.status(400).json({ error: err.message });
  }
});

// Create profile
app.post('/api/profiles', async (req, res) => {
  try {
    const profile = new UserProfile(req.body);
    await profile.save();
    res.status(201).json(profile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get profiles
app.get('/api/profiles', async (req, res) => {
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
app.get('/api/profiles/:id', async (req, res) => {
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

// Delete profile
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

// Create material
app.post('/api/materials', async (req, res) => {
  try {
    const material = new LearningMaterial(req.body);
    await material.save();
    res.status(201).json(material);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get materials
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
    console.error('Full error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get material by ID
app.get('/api/materials/:id', async (req, res) => {
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