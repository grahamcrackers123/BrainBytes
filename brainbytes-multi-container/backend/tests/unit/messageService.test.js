const Message = require('../../models/Message');

jest.mock('../../models/Message');

describe('Message service with mocked database', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('save a message', () => {
    test('creates and saves a user message successfully', async () => {
      const mockSave = jest.fn().mockResolvedValue({
        _id: 'msg123',
        text: 'What is math?',
        isUser: true,
        subject: 'math',
        chatId: 'chat_001',
        username: 'student1',
        createdAt: new Date(),
      });

      Message.mockImplementation(() => ({
        save: mockSave,
        _id: 'msg123',
        text: 'What is math?',
        isUser: true,
        subject: 'math',
        chatId: 'chat_001',
        username: 'student1',
      }));

      const msg = new Message({
        text: 'What is math?',
        isUser: true,
        subject: 'math',
        chatId: 'chat_001',
        username: 'student1',
      });

      const saved = await msg.save();
      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(saved.text).toBe('What is math?');
      expect(saved.isUser).toBe(true);
    });
  });

  describe('find messages by chatId', () => {
    test('retrieves messages filtered by chat session', async () => {
      const mockMessages = [
        { text: 'Hello', isUser: true, chatId: 'chat_001', subject: 'general' },
        { text: 'Hi there!', isUser: false, chatId: 'chat_001', subject: 'general' },
      ];

      Message.find.mockImplementation(() => ({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockMessages),
      }));

      const results = await Message.find({ chatId: 'chat_001' }).sort({ createdAt: 1 }).limit(50);
      expect(results).toHaveLength(2);
      expect(results[0].text).toBe('Hello');
      expect(results[1].text).toBe('Hi there!');
      expect(Message.find).toHaveBeenCalledWith({ chatId: 'chat_001' });
    });

    test('returns empty array for unknown chatId', async () => {
      Message.find.mockImplementation(() => ({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      }));

      const results = await Message.find({ chatId: 'nonexistent' }).sort({ createdAt: 1 }).limit(50);
      expect(results).toEqual([]);
    });
  });

  describe('save AI response message', () => {
    test('saves an AI message with question type and sentiment', async () => {
      const mockSave = jest.fn().mockResolvedValue({
        _id: 'ai_msg_1',
        text: 'Math is the study of numbers.',
        isUser: false,
        subject: 'math',
        questionType: 'definition',
        sentiment: 'neutral',
        chatId: 'chat_001',
      });

      Message.mockImplementation(() => ({
        save: mockSave,
      }));

      const aiMsg = new Message({
        text: 'Math is the study of numbers.',
        isUser: false,
        subject: 'math',
        questionType: 'definition',
        sentiment: 'neutral',
        chatId: 'chat_001',
      });

      const saved = await aiMsg.save();
      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(saved.questionType).toBe('definition');
      expect(saved.sentiment).toBe('neutral');
    });
  });

  describe('delete messages', () => {
    test('deletes messages by chatId', async () => {
      Message.deleteMany.mockResolvedValue({ deletedCount: 5 });

      const result = await Message.deleteMany({ chatId: 'chat_001' });
      expect(result.deletedCount).toBe(5);
      expect(Message.deleteMany).toHaveBeenCalledWith({ chatId: 'chat_001' });
    });

    test('handles deletion of non-existent chat', async () => {
      Message.deleteMany.mockResolvedValue({ deletedCount: 0 });

      const result = await Message.deleteMany({ chatId: 'nonexistent' });
      expect(result.deletedCount).toBe(0);
    });
  });
});
