# Yeda — Requirements Document

> **Status**: Draft — requirements are being collected iteratively.

## 1. Purpose

A web-based learning platform for subjects including (but not limited to) math, physics, English, and chemistry. Students practice and take exams on material uploaded by teachers.

## 2. Users & Roles

| Role | Description |
|---|---|
| **Admin** | Platform administrators — approves teacher registrations, full system management |
| **Teacher** | Uploads and manages course material, approves student registrations |
| **Student** | Practices, studies, and takes exams on uploaded material |

All user types (admin, teacher, student) must be able to **sign up** and **sign in**.

### 2.1 Registration Flow

1. Anyone can sign up and select their role (teacher or student).
2. **Teacher registrations** require **admin approval** before the teacher can upload content.
3. **Student registrations** start in `PENDING_APPROVAL` status. They cannot sign in until approved.
4. Pending student registrations appear in a pool that **admins and teachers** can view and approve.
5. Once approved, the student can sign in and access the platform freely.
6. There are **no notifications** for approvals. Teachers periodically check the pending list; students try signing in to discover their status.

### 2.2 Account Management (Phase 1)

- **Password reset** via email (Supabase Auth built-in).
- No profile editing page in Phase 1.

## 3. Exercise Format

- All exercises and exams use a **multiple-choice question (MCQ)** format.
- Mathematical notation is supported via **LaTeX rendering** from Phase 1.

## 4. Student UX Flow

1. **Sign In / Sign Up** — authentication page
2. **Grade Selection** — e.g., 10th grade, 11th grade
3. **Subject Selection** — e.g., mathematics, physics, chemistry, English
4. **Mode Selection** — one of:
   - **Study** — read course material (see section 4.1)
   - **Exercise** — practice MCQs with hints and explanations (see section 4.2)
   - **Exam** — graded MCQ test (see section 4.3)

### 4.1 Study Mode

- Displays **course material from Google Docs**.
- Teachers embed a Google Docs share link; the platform renders the document inline.
- This is **reading-only** — no questions, no scoring.

### 4.2 Exercise Mode

- Student **chooses how many questions** to answer (e.g., 10, 20, all).
- Questions are **randomly drawn** from the topic's question bank.
- **Before answering**: Student may request a **hint** (if the question has one).
- **After answering**: Student sees whether they were correct and may view an **explanation** (if the question has one).
- No timer, no formal scoring (though correct/incorrect may be shown per question).
- Unlimited practice — student can start a new exercise session anytime.

### 4.3 Exam Mode

- Teacher configures **time limit** and **question count**.
- Questions are **randomly drawn** from the bank.
- **No hints** available during the exam.
- **No explanations** until the exam is submitted.
- After submission: student sees their **score** and **explanations for all questions**.
- **Unlimited retakes** — each attempt draws a new random set (if the bank is large enough).
- Phase 1 tracks minimal data (scores and completion).

## 5. Content Management

### 5.1 File Manager (Teacher & Admin UX)

The file manager resembles **Google Drive** for organizing content.

- **Hierarchy**: Grades → Subjects → Topics — matching the student navigation structure.
- **Phase 1** (basic): Folder tree, add/delete/rename files and folders.
- **Phase 2** (full): Grid/list view toggle, drag-and-drop, search by name, sort by date/name.

### 5.2 Content Types per Topic

Within a topic folder, teachers can add:

| Content Type | Description |
|---|---|
| **Study Material** | Google Docs share link — rendered inline in Study mode |
| **MCQ Bank** | A set of multiple-choice questions (see section 5.3) |

### 5.3 MCQ Creation Flow

1. Teacher uses an **LLM of their choice** with a **structured prompt** (provided by the platform) to generate MCQs in a deterministic JSON format.
2. Teacher **pastes** the LLM output into the platform.
3. The platform **parses and validates** the structured data against the MCQ schema.
4. Teacher sees a **preview of all parsed questions** as a list.
5. Teacher can **edit or delete** individual questions.
6. Teacher clicks **Publish** — the MCQ bank goes live.

#### MCQ JSON Schema (to be defined before implementation)

> ⚠️ **This schema must be precisely finalized before any implementation begins.** The entire MCQ creation flow (prompt template for teachers, paste & parse logic, validation, storage model) depends on it.

Each question includes:
| Field | Required | Description |
|---|---|---|
| `question` | Yes | The question text (supports LaTeX) |
| `options` | Yes | Array of 4 answer choices |
| `correctIndex` | Yes | Index of the correct option (0–3) |
| `hint` | No | Hint shown before answering (exercise mode only) |
| `explanation` | No | Explanation shown after answering |
| `topic` | No | Optional topic tag for organization |

## 6. Progress Tracking

- **Phase 1**: Minimal — track exam scores and completion status only.
- **Phase 2**: Full tracking — per-question history, progress bars per topic, performance trends for students, class-wide statistics for teachers.

## 7. Platform & Deployment

### 7.1 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | **Expo (React Native)** with `react-native-web` as the web rendering target |
| **Backend** | **Supabase** (PostgreSQL, Auth, Storage, Row-Level Security) |
| **Auth (Phase 1)** | Email + password |
| **Auth (Phase 2)** | Add Google OAuth |
| **Math Rendering** | LaTeX library (e.g., MathJax or KaTeX) — Phase 1 |
| **Language (Phase 1)** | English |
| **Language (Phase 2)** | Add Hebrew with full RTL layout support |

### 7.2 Deployment

- **Phase 1**: Supabase **free tier** (with potential to scale to paid plans).
- Web app served from a compatible hosting platform.

### 7.3 Phase 1 — Web Application

- Fully **responsive** — accessible from phones, iPads, tablets, and computers.
- Must work across all modern browsers on the above devices.

### 7.4 Phase 3 — Native Mobile Applications (Long-term)

- Port to **iOS app** and **Android app** from the same Expo codebase.
- Minimal additional work thanks to `react-native-web` architecture.

## 8. Phases Summary

| Phase | Scope |
|---|---|
| **Phase 1** | Core web platform: manual MCQ management, Google Docs study materials, Grade→Subject→Topic navigation, basic file manager, email/password auth, English UI, LaTeX support, minimal tracking |
| **Phase 2** | AI-powered MCQ generation from raw text uploads. Full file manager (drag-drop, search). Google OAuth. Full progress tracking. Hebrew/RTL support. |
| **Phase 3** | Native iOS and Android apps via Expo. |

## 9. Design & Implementation Guidelines

### 9.1 Prefer Existing Solutions Over Building From Scratch

For any capability, feature, or component — regardless of size — first search for an existing **open-source solution or dependency** that can be used without excessive compromise. Only build from scratch when no adequate existing solution is available.

**Examples** (not exhaustive):
- Authentication → Supabase Auth (built-in)
- File management UI → consider React Native file manager components
- LaTeX rendering → use KaTeX or MathJax
- AI generation → use an LLM API rather than training a model
- Google Docs embedding → standard iframe/embed approach

This applies across all layers: frontend components, backend libraries, DevOps tooling, and infrastructure.

## 10. Phase 3 Migration Notes

### 10.1 LaTeX Rendering on Native

**Risk**: LaTeX rendering libraries (KaTeX, MathJax) require a browser DOM. React Native's native rendering has no DOM.

**Mitigation**: On native, render LaTeX within a `<WebView>` component (an in-app browser). Community packages like `react-native-latex` are thin WebView wrappers around KaTeX.

**Design guidance**: In Phase 1, keep LaTeX fragments as plain text strings passed to the renderer. **Avoid coupling LaTeX rendering to any web-specific DOM logic.** This way, Phase 3 only requires swapping the renderer component per platform — the data (the LaTeX string) stays the same.

### 10.2 Google Docs Embedding on Native

**Risk**: Google Docs publish-to-web embeds rely on an iframe, which is a browser-only construct.

**Mitigation**: On native, render the Google Docs embed URL inside a `<WebView>`. The same approach as LaTeX.

**Design guidance**: Store the Google Docs embed URL as a plain string in the database, not tied to any web-specific iframe component. In Phase 1, render it in an iframe. In Phase 3, render it in a WebView. The data model doesn't change.
