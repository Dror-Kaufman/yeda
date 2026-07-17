import {
  parseMCQJson,
  formatValidationErrors,
  validateQuestion,
  MCQQuestionSchema,
} from '../mcq-schema';

describe('MCQQuestionSchema', () => {
  it('validates a correct question', () => {
    const result = MCQQuestionSchema.safeParse({
      question: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      correctIndex: 1,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a question with fewer than 4 options', () => {
    const result = MCQQuestionSchema.safeParse({
      question: 'What is 2 + 2?',
      options: ['3', '4', '5'],
      correctIndex: 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects correctIndex out of range', () => {
    const result = MCQQuestionSchema.safeParse({
      question: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      correctIndex: 4,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative correctIndex', () => {
    const result = MCQQuestionSchema.safeParse({
      question: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      correctIndex: -1,
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional hint, explanation, and topic', () => {
    const result = MCQQuestionSchema.safeParse({
      question: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      correctIndex: 1,
      hint: 'Think about addition',
      explanation: '2 + 2 = 4',
      topic: 'arithmetic',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty question', () => {
    const result = MCQQuestionSchema.safeParse({
      question: '',
      options: ['3', '4', '5', '6'],
      correctIndex: 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty option strings', () => {
    const result = MCQQuestionSchema.safeParse({
      question: 'What is 2 + 2?',
      options: ['', '4', '5', '6'],
      correctIndex: 1,
    });
    expect(result.success).toBe(false);
  });
});

describe('parseMCQJson', () => {
  it('parses a valid JSON array of questions', () => {
    const result = parseMCQJson(`[
      {
        "question": "Q1",
        "options": ["A", "B", "C", "D"],
        "correctIndex": 0
      },
      {
        "question": "Q2",
        "options": ["W", "X", "Y", "Z"],
        "correctIndex": 3
      }
    ]`);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].question).toBe('Q1');
      expect(result.data[1].correctIndex).toBe(3);
    }
  });

  it('normalizes a single question object into an array', () => {
    const result = parseMCQJson(`{
      "question": "Single Q",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 2
    }`);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].question).toBe('Single Q');
    }
  });

  it('returns error for invalid JSON', () => {
    const result = parseMCQJson('not json');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it('returns error when input is not an object or array', () => {
    const result = parseMCQJson('"just a string"');

    expect(result.success).toBe(false);
  });

  it('returns error for questions with wrong option count', () => {
    const result = parseMCQJson(`[{
      "question": "Bad Q",
      "options": ["A", "B"],
      "correctIndex": 0
    }]`);

    expect(result.success).toBe(false);
  });

  it('rejects questions with missing required fields', () => {
    const result = parseMCQJson(`[{
      "question": "Missing options",
      "correctIndex": 0
    }]`);

    expect(result.success).toBe(false);
  });

  it('handles hint/explanation/topic as optional', () => {
    const result = parseMCQJson(`[{
      "question": "Full Q",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "hint": "A hint",
      "explanation": "An explanation",
      "topic": "math"
    }]`);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].hint).toBe('A hint');
      expect(result.data[0].explanation).toBe('An explanation');
      expect(result.data[0].topic).toBe('math');
    }
  });

  it('returns error for empty array', () => {
    const result = parseMCQJson('[]');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });
});

describe('validateQuestion', () => {
  it('returns the validated question for valid input', () => {
    const result = validateQuestion({
      question: 'Valid?',
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 0,
    });
    expect(result).not.toBeNull();
    expect(result?.question).toBe('Valid?');
  });

  it('returns null for invalid input', () => {
    const result = validateQuestion({
      question: 'Bad',
      options: ['A', 'B'],
      correctIndex: 0,
    });
    expect(result).toBeNull();
  });

  it('returns null for completely wrong type', () => {
    const result = validateQuestion('not even an object');
    expect(result).toBeNull();
  });
});

describe('formatValidationErrors', () => {
  it('formats ZodErrors into human-readable strings', () => {
    const result = parseMCQJson(`[{
      "question": "",
      "options": ["Only", "Two"],
      "correctIndex": 5
    }]`);

    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = formatValidationErrors(result.errors);
      expect(formatted.length).toBeGreaterThan(0);

      // Should include field paths in messages
      const allMessages = formatted.join(' ');
      expect(allMessages).toContain('question');
    }
  });

  it('returns an empty array for empty input', () => {
    expect(formatValidationErrors([])).toEqual([]);
  });
});
