const axios = require('axios');

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://backend:3000';

describe('E2E: Backend API reachable from frontend container', () => {
  test('backend root responds with welcome message', async () => {
    const res = await axios.get(`${API_URL}/`);
    expect(res.status).toBe(200);
    expect(res.data.message).toBe('Welcome to the BrainBytes API');
  });

  test('can fetch messages list', async () => {
    const res = await axios.get(`${API_URL}/api/messages`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });

  test('can post a message and receive it back', async () => {
    const payload = {
      text: 'E2E test question',
      subject: 'general',
      chatId: `chat_e2e_${Date.now()}`,
      username: 'e2e_tester',
    };

    const post = await axios.post(`${API_URL}/api/messages`, payload);
    expect(post.status).toBe(201);
    expect(post.data.userMessage.text).toBe('E2E test question');

    const get = await axios.get(
      `${API_URL}/api/messages?chatId=${payload.chatId}`
    );
    expect(get.data.length).toBeGreaterThanOrEqual(1);
    expect(get.data[0].text).toBe('E2E test question');
  });

  test('can fetch materials list', async () => {
    const res = await axios.get(`${API_URL}/api/materials`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });
});