import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatInterface from '../../components/ChatInterface';

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

const mockApiResponse = (data, status = 200) => {
  global.fetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  });
};

const mockApiError = () => {
  global.fetch.mockRejectedValueOnce(new Error('Network error'));
};

describe('ChatInterface component', () => {
  test('renders the input form and send button', () => {
    render(<ChatInterface />);
    expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  test('does not submit empty messages', () => {
    render(<ChatInterface />);
    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('submits a valid message and displays user message', async () => {
    mockApiResponse({ message: 'AI response text' });

    render(<ChatInterface />);
    const input = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole('button', { name: /send/i });

    await userEvent.type(input, 'What is gravity?');
    fireEvent.click(sendButton);

    expect(await screen.findByText('What is gravity?')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/chat',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"message":"What is gravity?"'),
      })
    );
  });

  test('shows loading indicator while waiting for AI response', async () => {
    let resolvePromise;
    const fetchPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    global.fetch.mockReturnValueOnce(fetchPromise);

    render(<ChatInterface />);
    const input = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole('button', { name: /send/i });

    await userEvent.type(input, 'Explain quantum physics');
    fireEvent.click(sendButton);

    expect(await screen.findByText(/Explain quantum physics/i)).toBeInTheDocument();

    resolvePromise({
      ok: true,
      status: 200,
      json: async () => ({ message: 'Quantum physics is...' }),
    });

    await waitFor(() => {
      expect(screen.getByText('Quantum physics is...')).toBeInTheDocument();
    });
  });

  test('displays error message when API call fails', async () => {
    mockApiError();

    render(<ChatInterface />);
    const input = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole('button', { name: /send/i });

    await userEvent.type(input, 'What is a black hole?');
    fireEvent.click(sendButton);

    expect(await screen.findByText(/Sorry, I encountered an error/i)).toBeInTheDocument();
  });

  test('clears input after successful submission', async () => {
    mockApiResponse({ message: 'Response' });

    render(<ChatInterface />);
    const input = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole('button', { name: /send/i });

    await userEvent.type(input, 'Hello');
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  test('can send multiple messages in sequence', async () => {
    mockApiResponse({ message: 'First reply' });
    mockApiResponse({ message: 'Second reply' });

    render(<ChatInterface />);
    const input = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole('button', { name: /send/i });

    await userEvent.type(input, 'First question');
    fireEvent.click(sendButton);
    expect(await screen.findByText('First question')).toBeInTheDocument();
    expect(await screen.findByText('First reply')).toBeInTheDocument();

    await userEvent.type(input, 'Second question');
    fireEvent.click(sendButton);
    expect(await screen.findByText('Second question')).toBeInTheDocument();
    expect(await screen.findByText('Second reply')).toBeInTheDocument();
  });
});
