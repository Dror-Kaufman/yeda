Read docs/requirements.md and docs/session-20260716-requirements.md first.

The requirements doc is complete. No code has been written yet.

The first implementation task is to precisely define the MCQ JSON schema and the LLM prompt template that teachers will use with ChatGPT/etc. to generate structured MCQs. The schema fields outlined are:

- question (supports LaTeX)
- options (array of 4)
- correctIndex
- hint (optional)
- explanation (optional)

The exact JSON shape, validation rules, and the teacher-facing prompt template need to be designed. Everything else depends on this data contract.

After the schema is defined, Phase 1 implementation can begin: scaffold the Expo project with Supabase, implement auth, build the file manager, and build the MCQ player.
