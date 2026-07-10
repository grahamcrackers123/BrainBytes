// traffic-simulator.js
// Simulates realistic and error traffic against the BrainBytes backend.
// Usage: node traffic-simulator.js [normal|peak|error|quiet]

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const subjects = ['math', 'science', 'history', 'technology', 'geography', 'english', 'general'];
const sampleQuestions = [
  'What is photosynthesis?',
  'Explain the Pythagorean theorem',
  'Who was Jose Rizal?',
  'How does a for loop work?',
  'What are the continents?',
  'Define a metaphor'
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function sendMessage(broken = false) {
  const body = broken
    ? { text: '', subject: randomFrom(subjects) } // triggers 400 error intentionally
    : { text: randomFrom(sampleQuestions), subject: randomFrom(subjects), username: `sim_user_${Math.floor(Math.random() * 50)}` };

  try {
    const res = await fetch(`${BASE_URL}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    console.log(`${res.status} - ${broken ? 'ERROR CASE' : 'normal'}`);
  } catch (err) {
    console.error('Request failed:', err.message);
  }
}

async function runScenario(scenario) {
  console.log(`Running scenario: ${scenario}`);

  const config = {
    normal:  { requestsPerBatch: 3,  delayMs: 2000, errorRate: 0.05, durationMs: 60000 },
    peak:    { requestsPerBatch: 15, delayMs: 500,  errorRate: 0.1,  durationMs: 60000 },
    error:   { requestsPerBatch: 5,  delayMs: 1000, errorRate: 0.6,  durationMs: 30000 },
    quiet:   { requestsPerBatch: 1,  delayMs: 5000, errorRate: 0.02, durationMs: 60000 }
  }[scenario] || { requestsPerBatch: 3, delayMs: 2000, errorRate: 0.05, durationMs: 60000 };

  const endTime = Date.now() + config.durationMs;

  while (Date.now() < endTime) {
    const batch = [];
    for (let i = 0; i < config.requestsPerBatch; i++) {
      const broken = Math.random() < config.errorRate;
      batch.push(sendMessage(broken));
    }
    await Promise.all(batch);
    await new Promise(r => setTimeout(r, config.delayMs));
  }

  console.log(`Scenario "${scenario}" complete.`);
}

const scenario = process.argv[2] || 'normal';
runScenario(scenario);