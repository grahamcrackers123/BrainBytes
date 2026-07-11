const express = require('express');
const os = require('os');
const { fork } = require('child_process');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(express.json());

const API_URL = process.env.BRAINBYTES_URL || 'http://localhost:5000';

const triggerLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,              // 5 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many trigger requests - wait a minute before trying again.'
});

app.post('/alert', (req, res) => {
  console.log('=== ALERT RECEIVED ===');
  console.log(JSON.stringify(req.body, null, 2));
  console.log('======================');
  res.status(200).end();
});

// webhook at http://localhost:8080/alert
app.post('/alert', (req, res) => {
  console.log('=== ALERT RECEIVED ===');
  console.log(JSON.stringify(req.body, null, 2));
  console.log('======================');
  res.status(200).end();
});

const workerScript = `
  const start = Date.now();
  const duration = parseInt(process.argv[2], 10) * 1000;
  while (Date.now() - start < duration) {
    for (let i = 0; i < 1000000; i++) {
      Math.random() * Math.random();
    }
  }
  process.exit(0);
`;
const workerPath = path.join(__dirname, '_cpu_worker.js');
fs.writeFileSync(workerPath, workerScript);

app.get('/trigger-cpu', triggerLimiter, (req, res) => {
  const duration = parseInt(req.query.duration || '60', 10);
  const cores = os.cpus().length;
  console.log(`Triggering high CPU across ${cores} core(s) for ${duration} second(s)...`);

  for (let i = 0; i < cores; i++) {
    fork(workerPath, [duration]);
  }

  res.send(`Triggered high CPU for ${duration} seconds across ${cores} worker process(es).`);
});



app.get('/trigger-errors', triggerLimiter, async (req, res) => {
  console.log('Simulating error spike...');
  const count = parseInt(req.query.count || '20', 10);

  // Make API error calls
  for (let i = 0; i < count; i++) {
    fetch(`${API_URL}/api/nonexistent-endpoint`)
      .catch(() => console.log(`Generated error ${i + 1}`));
  }
  res.send(`Triggered ${count} errors against ${API_URL}`);
});

// start server
const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Alert test helper running on port ${PORT}`);
  console.log(`Targeting backend at ${API_URL}`);
  console.log('Available test endpoints:');
  console.log('- GET /trigger-cpu?duration=60');
  console.log('- GET /trigger-errors?count=20');
});
