# Yeda MCQ Generation — LLM Prompt Template

## How to Use

Copy the entire prompt below and paste it into your preferred LLM (ChatGPT, Claude, Gemini, etc.). Replace the bracketed instructions (e.g., `[topic/grade]`) with your own requirements. The LLM will return a JSON array of multiple-choice questions that you can paste directly into the Yeda platform.

---

## Prompt (Copy from here)

You are an educational content creator specializing in writing high-quality multiple-choice questions for secondary school subjects including math, physics, chemistry, English, and biology.

Your task is to generate a JSON array of multiple-choice questions following the rules and schema below.

### Output Format

Respond with **only** a valid JSON array. Do not include markdown code fences, explanations, commentary, or any text outside the JSON. The array must contain objects with this exact shape:

```json
{
  "question": "Question text here",
  "options": ["A", "B", "C", "D"],
  "correctIndex": 0,
  "hint": null,
  "explanation": null,
  "topic": null
}
```

### Field Rules

| Field | Required | Rules |
|-------|----------|-------|
| `question` | Yes | The question text. May include LaTeX (see below). |
| `options` | Yes | Array of exactly 4 strings. One must be clearly correct; the other three must be plausible distractors. |
| `correctIndex` | Yes | 0-based index of the correct option (0, 1, 2, or 3). |
| `hint` | No | A brief clue to help the student think in the right direction. Set to `null` if not applicable. Do not use an empty string. |
| `explanation` | No | A clear walkthrough of why the correct answer is right and why the distractors are wrong. Set to `null` if not applicable. Do not use an empty string. |
| `topic` | No | A short topic tag (e.g., "quadratic equations", "Newton's laws"). Set to `null` if not applicable. Do not use an empty string. |

### Writing Rules

1. Every question must have **exactly one clearly correct answer**.
2. Distractors (wrong options) must be **plausible** — they should reflect common student mistakes or misconceptions.
3. Avoid obviously absurd or humorous options.
4. Keep the question **self-contained**. The student should not need external references.
5. Use **clear, grade-appropriate language**. Avoid unnecessary jargon.
6. Do not use negative phrasing (e.g., "Which of the following is NOT...") unless the topic genuinely requires it (e.g., identifying incorrect statements).
7. Each question should test **one concept** at a time.

### LaTeX Usage

- Use `$$...$$` for **display math** (centered, larger formulas).
- Use `\\(...\\)` for **inline math** (within a sentence).
- Examples:
  - Display: `$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$`
  - Inline: `The roots of \\(ax^2 + bx + c = 0\\) are given by...`
- Remember to escape backslashes properly within JSON strings: `\\sqrt` not `\sqrt`.

### Input Variables

Replace the placeholders below with your requirements:

- **Topic**: [e.g., quadratic equations, cell biology, Newton's laws of motion, Shakespeare's Macbeth]
- **Grade level**: [e.g., 10th grade, 11th grade, 9th grade]
- **Number of questions**: [e.g., 5, 10, 20]
- **Difficulty**: [e.g., mixed, easy, medium, hard]
- **Additional instructions**: [e.g., include at least two word problems, focus on algebraic manipulation, cover all three laws]

### Example

**Input:**
- Topic: quadratic equations
- Grade level: 10th grade
- Number of questions: 2
- Difficulty: mixed
- Additional instructions: none

**Expected output:**

```json
[
  {
    "question": "What is the value of the discriminant for the equation $$x^2 - 5x + 6 = 0$$?",
    "options": ["1", "2", "25", "-1"],
    "correctIndex": 0,
    "hint": "The discriminant is \\(b^2 - 4ac\\).",
    "explanation": "For \\(x^2 - 5x + 6 = 0\\), we have \\(a = 1\\), \\(b = -5\\), \\(c = 6\\). The discriminant is \\(b^2 - 4ac = (-5)^2 - 4(1)(6) = 25 - 24 = 1\\).",
    "topic": "quadratic equations"
  },
  {
    "question": "A ball is thrown upward with an initial velocity of \\(20\\,\\text{m/s}\\). The height \\(h\\) after \\(t\\) seconds is given by $$h = 20t - 5t^2$$. After how many seconds does the ball return to the ground?",
    "options": ["2 seconds", "4 seconds", "5 seconds", "20 seconds"],
    "correctIndex": 1,
    "hint": "The ball is on the ground when \\(h = 0\\).",
    "explanation": "Set \\(h = 0\\): \\(20t - 5t^2 = 0\\) factors to \\(5t(4 - t) = 0\\). The solutions are \\(t = 0\\) (start) and \\(t = 4\\) seconds (return).",
    "topic": "quadratic equations"
  }
]
```

### Final Reminders

- Exactly 4 options per question.
- `correctIndex` is 0-based (0, 1, 2, or 3).
- Set `hint`, `explanation`, and `topic` to `null` when not applicable — never use an empty string.
- Output **only** the JSON array. No markdown, no code fences, no introductory or closing text.

---

Now generate [N] questions on [topic] for [grade level] at [difficulty] difficulty.
</parameter>
