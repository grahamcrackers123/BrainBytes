const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const { connectMongo, requireMongo, disconnectMongo } = require('./helpers');

let app;

beforeAll(async () => {
  await connectMongo('error handling integration tests');
  if (mongoose.connection.readyState !== 1) return;

  app = express();
  app.use(cors());
  app.use(express.json());

  // Route that simulates a database error
  app.get('/api/error-test/db-error', async (req, res) => {
    try {
      throw new Error('Database connection failed');
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Route that validates required fields
  app.post('/api/error-test/validate', async (req, res) => {
    try {
      const { required } = req.body;
      if (!required) {
        return res.status(400).json({ error: 'The field "required" is mandatory.' });
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Route that simulates a timeout
  app.get('/api/error-test/timeout', async (req, res) => {
    try {
      await new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 100);
      });
    } catch (err) {
      res.status(504).json({ error: err.message });
    }
  });

  // Catch-all 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  // Global error handler
  app.use((err, req, res) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });
});

afterAll(async () => {
  await disconnectMongo();
});

describe('Error handling middleware', () => {
  test('returns 500 for database connection failure', requireMongo(async () => {
    const res = await request(app).get('/api/error-test/db-error');
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Database connection failed');
  }));

  test('returns 400 for missing required field', requireMongo(async () => {
    const res = await request(app).post('/api/error-test/validate').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('The field "required" is mandatory.');
  }));

  test('passes validation with required field present', requireMongo(async () => {
    const res = await request(app).post('/api/error-test/validate').send({ required: 'present' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  }));

  test('returns 504 for request timeout', requireMongo(async () => {
    const res = await request(app).get('/api/error-test/timeout');
    expect(res.statusCode).toBe(504);
    expect(res.body.error).toBe('Request timeout');
  }));

  test('returns 404 for unknown routes', requireMongo(async () => {
    const res = await request(app).get('/api/nonexistent-route');
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Route not found');
  }));

  test('handles malformed JSON body gracefully', requireMongo(async () => {
    const res = await request(app)
      .post('/api/materials')
      .set('Content-Type', 'application/json')
      .send('not valid json');
    expect(res.statusCode).toBe(400);
  }));

  test('returns 404 for POST to non-existent route', requireMongo(async () => {
    const res = await request(app).post('/api/nowhere');
    expect(res.statusCode).toBe(404);
  }));
});
