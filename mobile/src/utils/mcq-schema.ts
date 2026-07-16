import { z, ZodError } from 'zod';

// ── Types ──────────────────────────────────────────────────────────

export interface MCQQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  hint?: string;
  explanation?: string;
  topic?: string;
}

export interface MCQParseSuccess {
  success: true;
  data: MCQQuestion[];
}

export interface MCQParseFailure {
  success: false;
  errors: ZodError[];
}

export type MCQParseResult = MCQParseSuccess | MCQParseFailure;

// ── Zod Schemas ────────────────────────────────────────────────────

const optionSchema = z.string().min(1, 'Option must not be empty').max(1000);

export const MCQQuestionSchema = z
  .object({
    question: z.string().min(1, 'Question is required').max(2000),
    options: z.tuple([optionSchema, optionSchema, optionSchema, optionSchema]),
    correctIndex: z
      .number()
      .int('correctIndex must be an integer')
      .min(0, 'correctIndex must be between 0 and 3')
      .max(3, 'correctIndex must be between 0 and 3'),
    hint: z.string().max(500).optional(),
    explanation: z.string().max(2000).optional(),
    topic: z.string().max(200).optional(),
  })
  .refine((data) => data.correctIndex < data.options.length, {
    message: 'correctIndex must be within the range of available options',
    path: ['correctIndex'],
  });

export const MCQBankSchema = z.array(MCQQuestionSchema);

// ── Helper Functions ───────────────────────────────────────────────

/**
 * Parse a JSON string containing one or more MCQ questions.
 * Accepts both single question objects and arrays of questions.
 *
 * @param jsonString - Raw JSON string to parse
 * @returns Discriminated union with validated data or validation errors
 */
export function parseMCQJson(jsonString: string): MCQParseResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return {
      success: false,
      errors: [
        new ZodError([
          { code: z.ZodIssueCode.custom, message: 'Invalid JSON', path: [] },
        ]),
      ],
    };
  }

  // Normalize a single question object into an array
  if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
    parsed = [parsed];
  }

  if (!Array.isArray(parsed)) {
    return {
      success: false,
      errors: [
        new ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: 'Expected a question object or an array of questions',
            path: [],
          },
        ]),
      ],
    };
  }

  const result = MCQBankSchema.safeParse(parsed);

  if (result.success) {
    return { success: true, data: result.data as MCQQuestion[] };
  }

  return { success: false, errors: [result.error] };
}

/**
 * Validate a single unknown value as an MCQ question.
 *
 * @param question - Value to validate
 * @returns The validated question, or null if validation fails
 */
export function validateQuestion(question: unknown): MCQQuestion | null {
  const result = MCQQuestionSchema.safeParse(question);
  if (result.success) {
    return result.data as MCQQuestion;
  }
  return null;
}

/**
 * Format Zod validation errors into human-readable messages.
 *
 * @param errors - Array of ZodError instances
 * @returns Flat array of formatted error strings (e.g. "options[0]: Option must not be empty")
 */
export function formatValidationErrors(errors: ZodError[]): string[] {
  const messages: string[] = [];
  for (const error of errors) {
    for (const issue of error.issues) {
      const prefix = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
      messages.push(`${prefix}${issue.message}`);
    }
  }
  return messages;
}
