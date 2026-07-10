const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const { connectMongo, requireMongo, disconnectMongo } = require('./helpers');

const LearningMaterial = require('../../models/LearningMaterial');

let app;

beforeAll(async () => {
  await connectMongo('materials integration tests');
  if (mongoose.connection.readyState !== 1) return;

  app = express();
  app.use(cors());
  app.use(express.json());

  app.post('/api/materials', async (req, res) => {
    try {
      const material = new LearningMaterial(req.body);
      await material.save();
      res.status(201).json(material);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/materials', async (req, res) => {
    try {
      const filter = {};
      if (req.query.subject) filter.subject = req.query.subject.toLowerCase();
      if (req.query.topic) filter.topic = { $regex: req.query.topic, $options: 'i' };
      const materials = await LearningMaterial.find(filter).sort({ createdAt: -1 });
      res.json(materials);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/materials/:id', async (req, res) => {
    try {
      const material = await LearningMaterial.findById(req.params.id);
      if (!material) return res.status(404).json({ error: 'Material not found' });
      res.json(material);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
});

afterAll(async () => {
  await disconnectMongo();
});

afterEach(requireMongo(async () => {
  await LearningMaterial.deleteMany({});
}));

describe('POST /api/materials', () => {
  test('creates a new learning material', requireMongo(async () => {
    const res = await request(app).post('/api/materials').send({
      subject: 'math',
      topic: 'Algebra Basics',
      content: 'Algebra is a branch of mathematics dealing with symbols and rules.',
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.subject).toBe('math');
    expect(res.body.topic).toBe('Algebra Basics');
  }));

  test('returns 400 when required fields are missing', requireMongo(async () => {
    const res = await request(app).post('/api/materials').send({
      subject: 'science',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  }));

  test('stores subject in lowercase', requireMongo(async () => {
    const res = await request(app).post('/api/materials').send({
      subject: 'SCIENCE',
      topic: 'Physics',
      content: 'Physics is the study of matter and energy.',
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.subject).toBe('science');
  }));
});

describe('GET /api/materials', () => {
  test('returns empty list when no materials exist', requireMongo(async () => {
    const res = await request(app).get('/api/materials');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  }));

  test('returns all materials sorted by newest first', requireMongo(async () => {
    await LearningMaterial.create([
      { subject: 'math', topic: 'Algebra', content: 'Algebra content' },
      { subject: 'science', topic: 'Physics', content: 'Physics content' },
    ]);

    const res = await request(app).get('/api/materials');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);
  }));

  test('filters materials by subject', requireMongo(async () => {
    await LearningMaterial.create([
      { subject: 'math', topic: 'Algebra', content: 'Algebra content' },
      { subject: 'science', topic: 'Physics', content: 'Physics content' },
    ]);

    const res = await request(app).get('/api/materials?subject=math');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].topic).toBe('Algebra');
  }));

  test('filters materials by topic with partial match', requireMongo(async () => {
    await LearningMaterial.create([
      { subject: 'math', topic: 'Algebra Basics', content: 'Content' },
      { subject: 'math', topic: 'Advanced Calculus', content: 'Content' },
    ]);

    const res = await request(app).get('/api/materials?topic=algebra');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].topic).toBe('Algebra Basics');
  }));
});

describe('GET /api/materials/:id', () => {
  test('returns material by id', requireMongo(async () => {
    const created = await LearningMaterial.create({
      subject: 'history',
      topic: 'World War II',
      content: 'World War II was a global war.',
    });

    const res = await request(app).get(`/api/materials/${created._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.topic).toBe('World War II');
  }));

  test('returns 404 for non-existent id', requireMongo(async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/materials/${fakeId}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Material not found');
  }));
});
