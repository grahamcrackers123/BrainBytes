const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');

const UserProfile = require('../../models/UserProfile');

let app;

beforeAll(async () => {
  const mongoUrl = process.env.MONGO_URL || 'mongodb://mongo:27017/brainbytes_test';
  await mongoose.connect(mongoUrl);
  await mongoose.connection.dropDatabase();

  app = express();
  app.use(cors());
  app.use(express.json());

  app.post('/api/profiles', async (req, res) => {
    try {
      const profile = new UserProfile(req.body);
      await profile.save();
      res.status(201).json(profile);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

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
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/profiles/:id', async (req, res) => {
    try {
      const profile = await UserProfile.findById(req.params.id);
      if (!profile) return res.status(404).json({ error: 'Profile not found' });
      res.json(profile);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/profiles/:id', async (req, res) => {
    try {
      const profile = await UserProfile.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!profile) return res.status(404).json({ error: 'Profile not found' });
      res.json(profile);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/profiles/:id', async (req, res) => {
    try {
      const profile = await UserProfile.findByIdAndDelete(req.params.id);
      if (!profile) return res.status(404).json({ error: 'Profile not found' });
      res.json({ message: 'Profile deleted' });
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
  await UserProfile.deleteMany({});
});

describe('POST /api/profiles', () => {
  test('creates a new user profile', async () => {
    const res = await request(app).post('/api/profiles').send({
      name: 'Alice',
      email: 'alice@example.com',
      preferredSubjects: ['math', 'science'],
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('Alice');
    expect(res.body.email).toBe('alice@example.com');
    expect(res.body.preferredSubjects).toEqual(['math', 'science']);
  });

  test('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/profiles').send({
      name: 'Bob',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('prevents duplicate email', async () => {
    await request(app).post('/api/profiles').send({
      name: 'Alice',
      email: 'alice@example.com',
    });

    const res = await request(app).post('/api/profiles').send({
      name: 'Alice Again',
      email: 'alice@example.com',
    });

    expect(res.statusCode).toBe(400);
  });

  test('creates profile without preferred subjects', async () => {
    const res = await request(app).post('/api/profiles').send({
      name: 'Charlie',
      email: 'charlie@example.com',
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.preferredSubjects).toEqual([]);
  });
});

describe('GET /api/profiles', () => {
  test('returns empty list when no profiles exist', async () => {
    const res = await request(app).get('/api/profiles');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns all profiles', async () => {
    await UserProfile.create([
      { name: 'Alice', email: 'alice@example.com' },
      { name: 'Bob', email: 'bob@example.com' },
    ]);

    const res = await request(app).get('/api/profiles');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('filters profiles by preferred subjects', async () => {
    await UserProfile.create([
      { name: 'Alice', email: 'alice@example.com', preferredSubjects: ['math'] },
      { name: 'Bob', email: 'bob@example.com', preferredSubjects: ['science'] },
    ]);

    const res = await request(app).get('/api/profiles?subjects=math');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Alice');
  });
});

describe('GET /api/profiles/:id', () => {
  test('returns profile by id', async () => {
    const created = await UserProfile.create({ name: 'Alice', email: 'alice@example.com' });
    const res = await request(app).get(`/api/profiles/${created._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Alice');
  });

  test('returns 404 for non-existent id', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/profiles/${fakeId}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Profile not found');
  });
});

describe('PUT /api/profiles/:id', () => {
  test('updates profile name', async () => {
    const created = await UserProfile.create({ name: 'Alice', email: 'alice@example.com' });
    const res = await request(app).put(`/api/profiles/${created._id}`).send({ name: 'Alice Updated' });
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Alice Updated');
  });

  test('returns 404 when updating non-existent profile', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).put(`/api/profiles/${fakeId}`).send({ name: 'Ghost' });
    expect(res.statusCode).toBe(404);
  });
});

describe('DELETE /api/profiles/:id', () => {
  test('deletes an existing profile', async () => {
    const created = await UserProfile.create({ name: 'Alice', email: 'alice@example.com' });
    const res = await request(app).delete(`/api/profiles/${created._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Profile deleted');

    const check = await UserProfile.findById(created._id);
    expect(check).toBeNull();
  });

  test('returns 404 when deleting non-existent profile', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/api/profiles/${fakeId}`);
    expect(res.statusCode).toBe(404);
  });
});
