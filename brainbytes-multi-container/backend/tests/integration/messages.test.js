const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');

const Message = require('../../models/Message');

let app;

beforeAll(async () => {
  const mongoUrl = process.env.MONGO_URL || 'mongodb://mongo:27017/brainbytes_test';
  await mongoose.connect(mongoUrl);

  app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/messages', async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
      const filter = {};
      if (req.query.chatId) filter.chatId = req.query.chatId;
      if (req.query.username) filter.username = req.query.username;
      const messages = await Message.find(filter).sort({ createdAt: 1 }).limit(limit);
      res.json(messages);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/messages', async (req, res) => {
    try {
      const { text, subject, chatId, username } = req.body;
      if (!text) return res.status(400).json({ error: 'Message text is required.' });

      const userMessage = new Message({
        text,
        isUser: true,
        subject: subject || 'general',
        chatId: chatId || `chat_test_${Date.now()}`,
        username: username || '',
        category: subject || 'general',
      });
      await userMessage.save();
      res.status(201).json({ userMessage });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

afterEach(async () => {
  await Message.deleteMany({});
});

describe('GET /api/messages', () => {
  test('returns empty array when no messages exist', async () => {
    const res = await request(app).get('/api/messages');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns messages for a specific chatId', async () => {
    await Message.create({
      text: 'Hello',
      isUser: true,
      chatId: 'chat_test_1',
      subject: 'general',
      category: 'general',
    });

    const res = await request(app).get('/api/messages?chatId=chat_test_1');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].text).toBe('Hello');
  });

  test('filters messages by username', async () => {
    await Message.create([
      { text: 'Hi', isUser: true, chatId: 'chat_1', username: 'alice', subject: 'general', category: 'general' },
      { text: 'Hey', isUser: true, chatId: 'chat_2', username: 'bob', subject: 'math', category: 'math' },
    ]);

    const res = await request(app).get('/api/messages?username=alice');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].username).toBe('alice');
  });
});

describe('POST /api/messages', () => {
  test('creates a user message successfully', async () => {
    const res = await request(app).post('/api/messages').send({
      text: 'What is gravity?',
      subject: 'science',
      chatId: 'chat_test_99',
      username: 'testuser',
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.userMessage.text).toBe('What is gravity?');
    expect(res.body.userMessage.isUser).toBe(true);
    expect(res.body.userMessage.subject).toBe('science');
  });

  test('returns 400 when text is missing', async () => {
    const res = await request(app).post('/api/messages').send({
      subject: 'math',
      chatId: 'chat_test_100',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Message text is required.');
  });

  test('defaults subject to general when not provided', async () => {
    const res = await request(app).post('/api/messages').send({
      text: 'Tell me something',
      chatId: 'chat_test_101',
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.userMessage.subject).toBe('general');
  });
});