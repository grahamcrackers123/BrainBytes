const {
  detectQuestionType,
  detectSentiment,
} = require('../../aiService');

describe('detectQuestionType', () => {
  test('returns "definition" for "what is" questions', () => {
    expect(detectQuestionType('what is photosynthesis')).toBe('definition');
  });

  test('returns "definition" for "define" questions', () => {
    expect(detectQuestionType('define gravity')).toBe('definition');
  });

  test('returns "explanation" for "how" questions', () => {
    expect(detectQuestionType('how does the water cycle work')).toBe('explanation');
  });

  test('returns "explanation" for "why" questions', () => {
    expect(detectQuestionType('why is the sky blue')).toBe('explanation');
  });

  test('returns "explanation" for questions with "explain"', () => {
    expect(detectQuestionType('can you explain recursion')).toBe('explanation');
  });

  test('returns "example" when question includes "example"', () => {
    expect(detectQuestionType('give me an example of a loop')).toBe('example');
  });

  test('returns "general" for unrecognised questions', () => {
    expect(detectQuestionType('tell me about black holes')).toBe('general');
  });
});

describe('detectSentiment', () => {
  test('returns "frustrated" for frustrated keywords', () => {
    expect(detectSentiment('i hate this, it is not working')).toBe('frustrated');
  });

  test('returns "confused" for confused keywords', () => {
    expect(detectSentiment('i am confused and stuck')).toBe('confused');
  });

  test('returns "neutral" for normal questions', () => {
    expect(detectSentiment('how do i solve this equation')).toBe('neutral');
  });
});