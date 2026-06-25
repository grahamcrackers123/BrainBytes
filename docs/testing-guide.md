# BrainBytes Testing Guide

## Overview

BrainBytes uses **Jest** for unit and integration tests, **@testing-library/react** for frontend component tests, and **Playwright** for end-to-end (E2E) browser tests.

## Test Structure

```
brainbytes-multi-container/
├── frontend/
│   ├── tests/
│   │   ├── components/          # React component tests
│   │   │   └── ChatInterface.test.js
│   │   └── endpoint/            # API connectivity tests
│   │       └── chat.test.js
│   ├── jest.config.js
│   └── jest.setup.js
├── backend/
│   ├── tests/
│   │   ├── unit/                # Isolated unit tests (mocked DB)
│   │   │   ├── aiService.test.js
│   │   │   └── messageService.test.js
│   │   └── integration/         # Integration tests (real DB)
│   │       ├── messages.test.js
│   │       ├── profiles.test.js
│   │       ├── materials.test.js
│   │       └── errorHandling.test.js
│   └── jest.config.js
└── e2e-tests/
    ├── tests/
    │   └── smoke.spec.js        # Playwright E2E smoke tests
    ├── playwright.config.js
    └── package.json
```

## Running Tests

### Frontend Tests

```bash
cd brainbytes-multi-container/frontend
npm test                           # Run all tests
npm test -- --watch                # Watch mode
npm test -- --coverage             # With coverage report
npm test -- -t "ChatInterface"     # Run specific test by name
npm test -- tests/components/ChatInterface.test.js  # Run a specific file
```

### Backend Tests

```bash
cd brainbytes-multi-container/backend
npm test                           # Run all tests
npm test -- --watch                # Watch mode
npm test -- --coverage             # With coverage report
npm test -- -t "profiles"          # Run tests matching "profiles"
```

### E2E Tests

```bash
cd brainbytes-multi-container/e2e-tests
npm run test:e2e                   # Run all Playwright tests
npx playwright test --headed       # Run with visible browser
npx playwright test --debug        # Run in debug mode
npx playwright show-report         # View HTML report
```

## Writing Tests

### Frontend Component Tests

Use `@testing-library/react` to render components and simulate user interactions:

```js
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyComponent from '../components/MyComponent';

test('renders and responds to user input', async () => {
  render(<MyComponent />);
  const input = screen.getByPlaceholderText(/enter text/i);
  await userEvent.type(input, 'Hello');
  fireEvent.click(screen.getByRole('button'));
  expect(await screen.findByText('Hello')).toBeInTheDocument();
});
```

### Testing Loading States

Mock slow API calls with a delayed promise:

```js
let resolvePromise;
global.fetch.mockReturnValueOnce(new Promise((resolve) => {
  resolvePromise = resolve;
}));
// Trigger action, assert loading state shown
resolvePromise({ ok: true, json: async () => ({ data: 'result' }) });
// Assert result shown
```

### Testing Error States

Mock API failures:

```js
global.fetch.mockRejectedValueOnce(new Error('Network error'));
// Trigger action, assert error message shown
```

### Backend Integration Tests

Use Supertest to test API endpoints:

```js
const request = require('supertest');
const app = require('../app');  // Your Express app

test('GET /api/materials returns list', async () => {
  const res = await request(app).get('/api/materials');
  expect(res.statusCode).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});
```

### Backend Unit Tests with Mocks

Mock Mongoose models to test service logic without a database:

```js
const Message = require('../../models/Message');
jest.mock('../../models/Message');

test('saves a message', async () => {
  Message.mockImplementation(() => ({
    save: jest.fn().mockResolvedValue({ text: 'Hello' }),
  }));
  const msg = new Message({ text: 'Hello' });
  const saved = await msg.save();
  expect(saved.text).toBe('Hello');
});
```

## Debugging Tests

### Console logging

```js
test('debug with console.log', () => {
  const result = myFunction();
  console.log('Result:', result);
  expect(result).toBe(expected);
});
```

### Debug rendered DOM

```js
import { render, screen } from '@testing-library/react';

test('debug component output', () => {
  const { debug } = render(<MyComponent />);
  debug(); // Prints the component's DOM to console
});
```

### Run a single test file

```bash
npm test -- --testPathPattern="messages"
```

### Run test by name

```bash
npm test -- -t "creates a new profile"
```

## CI/CD Integration

Tests run automatically in GitHub Actions:
- **Lint** job checks code quality
- **Test** job runs all Jest tests with coverage
- **E2E** job runs Playwright browser tests
- Coverage reports are uploaded as artifacts

To check test results in a PR, look for the check status annotations inline, or open the Actions tab in GitHub.
