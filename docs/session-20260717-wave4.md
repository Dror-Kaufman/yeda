# Session 2026-07-17 — Wave 4 Complete (Exercise, Exam, Study, LaTeX)

## What Was Built

### Bug Fix
- **Duplicate error message on sign-in**: `sign-in.tsx` showed both the `alreadySignedUp` informational block and the `error` block simultaneously when a pending user tried to sign in. Changed to a mutually exclusive ternary chain (error wins, then alreadySignedUp, then nothing).

### Wave 4.4 — Exercise Mode
- **Intro screen** (`topic/[topicId]/exercise/index.tsx`): Student picks question count (5/10/20/All). Disabled options that exceed available questions.
- **Session screen** (`topic/[topicId]/exercise/session.tsx`): One question at a time. "Show Hint" button before answering reveals hint. After answering: correct/incorrect feedback, "Show Explanation" button. Next/Finish navigation. Progress bar. Fisher-Yates shuffle for random draw.

### Wave 4.5 — Exam Mode
- **Intro screen** (`topic/[topicId]/exam/index.tsx`): Pick question count + time limit (5/10/15/30/60 min). Warning about no hints during exam.
- **Session screen** (`topic/[topicId]/exam/session.tsx`): Timer counting down (red when < 2 min). Navigable question dots. Previous/Next/Submit. Auto-submits on timer expiry. No hints or explanations during exam. Early submit option.
- **Results view**: After submit, shows score percentage + per-question review with correct/incorrect marking and explanations.

### Wave 4.6 — Study Mode
- **Material list** (`topic/[topicId]/study/index.tsx`): Fetches and displays study materials for the topic.
- **Inline viewer** (`topic/[topicId]/study/view.tsx`): Renders Google Docs URL in an iframe with a header bar and back button.

### Wave 4.7 — Score Tracking
- Exam results saved to existing `exam_attempts` table (score, answers JSONB, started_at, completed_at).
- Results shown inline in the exam session screen after submission.

### Wave 4.8 — LaTeX Rendering
- **`<LatexText>` component** (`src/components/LatexText.tsx`): Parses `$...$` and `$$...$$` delimiters, renders via KaTeX on web using ref-based innerHTML. Falls back to plain text on error. Mixes plain text and LaTeX segments.
- KaTeX CSS imported globally in `src/app/_layout.tsx`.
- `src/global.d.ts` added for `.css` module type declarations.

## Key Decisions

1. **Ref-based innerHTML for KaTeX**: React Native's TypeScript types don't include `dangerouslySetInnerHTML` on `View`, even though react-native-web supports it at runtime. Used a `HtmlView` wrapper component with `useRef` + `innerHTML` assignment instead.

2. **Timer auto-submit pattern**: Used `setTimeout(() => handleSubmit(), 0)` when timer reaches 0 inside `setInterval` callback to avoid state-update-during-render.

3. **Exam session results inline**: Instead of navigating to a separate results screen, the exam session renders the results view in the same component after submit (phase switch). Simpler state management.

4. **No E2E tests for new modes**: The existing 12 Playwright tests still pass, but the new screens don't have E2E coverage yet.

## Gotchas
- **CSS side-effect imports need type declaration**: `import 'katex/dist/katex.min.css'` requires `declare module '*.css' {}` in a `.d.ts` file.
- **Expo Router deep nested routes**: Both `topic/[topicId]/exercise` and `topic/[topicId]/exercise/session` must each be registered in the layout `Stack.Screen`.
- **npm install can break jest-expo**: Installing new packages can remove `@react-native/jest-preset` from node_modules, causing jest-expo to fail. Reinstall with `npm install --save-dev @react-native/jest-preset --legacy-peer-deps`.
