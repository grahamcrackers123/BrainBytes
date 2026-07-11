const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { connectMongo, requireMongo, disconnectMongo } = require('./helpers');

const UserProfile = require('../../models/UserProfile');

let app;

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

beforeAll(async () => {
  await connectMongo('profiles integration tests');
  if (mongoose.connection.readyState !== 1) return;

  await UserProfile.createIndexes();

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

  app.put('/api/profiles/:id', apiLimiter, async (req, res) => {
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
}, 30000);

afterAll(async () => {
  await disconnectMongo();
});

afterEach(requireMongo(async () => {
  await UserProfile.deleteMany({});
}));

describe('POST /api/profiles', () => {
  test('creates a new user profile', requireMongo(async () => {
    const res = await request(app)
      .post('/api/profiles')
      .send({
        name: 'Alice',
        email: 'alice@example.com',
        preferredSubjects: ['math', 'science'],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('Alice');
    expect(res.body.email).toBe('alice@example.com');
    expect(res.body.preferredSubjects).toEqual(['math', 'science']);
  }));

  test('returns 400 when required fields are missing', requireMongo(async () => {
    const res = await request(app).post('/api/profiles').send({
      name: 'Bob',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  }));

  test('handles duplicate email gracefully', requireMongo(async () => {
    const first = await request(app).post('/api/profiles').send({
      name: 'Alice',
      email: 'alice@example.com',
    });
    expect(first.statusCode).toBe(201);

    const second = await request(app).post('/api/profiles').send({
      name: 'Alice Again',
      email: 'alice@example.com',
    });

    expect([400, 409, 500]).toContain(second.statusCode);
  }));

  test('creates profile without preferred subjects', requireMongo(async () => {
    const res = await request(app).post('/api/profiles').send({
      name: 'Charlie',
      email: 'charlie@example.com',
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.preferredSubjects).toEqual([]);
  }));
});

describe('GET /api/profiles', () => {
  test('returns empty list when no profiles exist', requireMongo(async () => {
    const res = await request(app).get('/api/profiles');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  }));

  test('returns all profiles', requireMongo(async () => {
    await UserProfile.create([
      { name: 'Alice', email: 'alice@example.com' },
      { name: 'Bob', email: 'bob@example.com' },
    ]);

    const res = await request(app).get('/api/profiles');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);
  }));

  test('filters profiles by preferred subjects', requireMongo(async () => {
    await UserProfile.create([
      { name: 'Alice', email: 'alice@example.com', preferredSubjects: ['math'] },
      { name: 'Bob', email: 'bob@example.com', preferredSubjects: ['science'] },
    ]);

    const res = await request(app).get('/api/profiles?subjects=math');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Alice');
  }));
});

describe('GET /api/profiles/:id', () => {
  test('returns profile by id', requireMongo(async () => {
    const created = await UserProfile.create({ name: 'Alice', email: 'alice@example.com' });
    const res = await request(app).get(`/api/profiles/${created._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Alice');
  }));

  test('returns 404 for non-existent id', requireMongo(async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/profiles/${fakeId}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Profile not found');
  }));
});

describe('PUT /api/profiles/:id', () => {
  test('updates profile name', requireMongo(async () => {
    const created = await UserProfile.create({ name: 'Alice', email: 'alice@example.com' });
    const res = await request(app)
      .put(`/api/profiles/${created._id}`)
      .send({ name: 'Alice Updated' });
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Alice Updated');
  }));

  test('returns 404 when updating non-existent profile', requireMongo(async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).put(`/api/profiles/${fakeId}`).send({ name: 'Ghost' });
    expect(res.statusCode).toBe(404);
  }));
});

describe('DELETE /api/profiles/:id', () => {
  test('deletes an existing profile', requireMongo(async () => {
    const created = await UserProfile.create({ name: 'Alice', email: 'alice@example.com' });
    const res = await request(app).delete(`/api/profiles/${created._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Profile deleted');

    const check = await UserProfile.findById(created._id);
    expect(check).toBeNull();
  }));

  test('returns 404 when deleting non-existent profile', requireMongo(async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/api/profiles/${fakeId}`);
    expect(res.statusCode).toBe(404);
  }));
});
