import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeBack } from '../../../../../utils/useSafeBack';
import { supabase } from '../../../../../utils/supabase';
import { colors, spacing, typography } from '../../../../../constants/theme';
import {
  parseMCQJson,
  formatValidationErrors,
  MCQQuestionSchema,
  type MCQQuestion,
} from '../../../../../utils/mcq-schema';

// ── Types ──────────────────────────────────────────────────────────

interface ParsedQuestion extends MCQQuestion {
  id: number; // local index for keying
  editing: boolean;
}

type ValidationIssue = {
  index: number;
  message: string;
};

// ── Component ──────────────────────────────────────────────────────

export default function PasteMCQScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const goBack = useSafeBack(`/topic/${topicId}/manage-questions`);

  const [jsonInput, setJsonInput] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [errors, setErrors] = useState<ValidationIssue[]>([]);
  const [parsing, setParsing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Parse ──────────────────────────────────────────────────────────

  const handleParse = () => {
    setErrors([]);
    setParsing(true);

    // Use a microtask so the spinner shows
    setTimeout(() => {
      const result = parseMCQJson(jsonInput);

      if (!result.success) {
        const formatted = formatValidationErrors(result.errors);
        setErrors(formatted.map((m) => ({ index: -1, message: m })));
        setParsedQuestions([]);
        setParsing(false);
        return;
      }

      // All good — build parsed question list
      setParsedQuestions(
        result.data.map((q, i) => ({ ...q, id: i, editing: false })),
      );
      setErrors([]);
      setParsing(false);
    }, 0);
  };

  // ── Edit / Delete ──────────────────────────────────────────────────

  const toggleEdit = (id: number) => {
    setParsedQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, editing: !q.editing } : q)),
    );
  };

  const updateField = (id: number, field: keyof MCQQuestion, value: unknown) => {
    setParsedQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q)),
    );
  };

  const updateOption = (id: number, index: number, value: string) => {
    setParsedQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        const newOptions = [...q.options] as [string, string, string, string];
        newOptions[index] = value;
        return { ...q, options: newOptions };
      }),
    );
  };

  const removeQuestion = (id: number) => {
    setParsedQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  // ── Validate single question before save ──────────────────────────

  const validateSingle = (q: MCQQuestion): string | null => {
    const result = MCQQuestionSchema.safeParse(q);
    if (!result.success) {
      return formatValidationErrors([result.error])[0] ?? 'Invalid question';
    }
    return null;
  };

  const saveEdit = (id: number) => {
    const q = parsedQuestions.find((x) => x.id === id);
    if (!q) return;

    setSaveError(null);
    const err = validateSingle(q);
    if (err) {
      setSaveError(err);
      return;
    }

    toggleEdit(id);
  };

  // ── Publish ────────────────────────────────────────────────────────

  const handlePublish = async () => {
    setPublishError(null);

    if (parsedQuestions.length === 0) {
      setPublishError('Add at least one question first.');
      return;
    }

    // Validate all before publishing
    for (const q of parsedQuestions) {
      const err = validateSingle(q);
      if (err) {
        setPublishError(
          `Question "${q.question.substring(0, 50)}...": ${err}\n\nEdit and fix before publishing.`,
        );
        return;
      }
    }

    setPublishing(true);

    const inserts = parsedQuestions.map((q) => ({
      topic_id: topicId,
      question_text: q.question,
      options: q.options,
      correct_index: q.correctIndex,
      hint: q.hint ?? null,
      explanation: q.explanation ?? null,
      status: 'published' as const,
    }));

    const { error: insertError } = await supabase
      .from('questions')
      .insert(inserts);

    setPublishing(false);

    if (insertError) {
      setPublishError(insertError.message);
      return;
    }

    // Published successfully — navigate back
    goBack();
  };

  // ── Render ─────────────────────────────────────────────────────────

  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back */}
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Text style={styles.backText}>{'\u2190'} Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Add MCQ Bank</Text>
          <Text style={styles.subtitle}>
            Paste the JSON output from your LLM below. The platform will
            validate and preview the questions before publishing.
          </Text>

          {/* JSON Textarea */}
          <Text style={styles.label}>Paste JSON here:</Text>
          <TextInput
            style={styles.textarea}
            multiline
            placeholder='[{"question": "What is 2+2?", "options": ["3", "4", "5", "6"], "correctIndex": 1}]'
            placeholderTextColor={colors.textTertiary}
            value={jsonInput}
            onChangeText={setJsonInput}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.primaryButton, parsing && styles.buttonDisabled]}
            onPress={handleParse}
            disabled={parsing || !jsonInput.trim()}
          >
            {parsing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Parse JSON</Text>
            )}
          </TouchableOpacity>

          {/* Validation errors */}
          {errors.length > 0 && (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Validation Errors</Text>
              {errors.map((e, i) => (
                <Text key={i} style={styles.errorItem}>
                  {e.message}
                </Text>
              ))}
            </View>
          )}

          {/* Parsed questions */}
          {parsedQuestions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Parsed Questions ({parsedQuestions.length})
              </Text>

              {parsedQuestions.map((q) => (
                <View key={q.id} style={styles.questionCard}>
                  {q.editing ? (
                    /* ── Edit mode ── */
                    <View>
                      <Text style={styles.fieldLabel}>Question</Text>
                      <TextInput
                        style={styles.editInput}
                        value={q.question}
                        onChangeText={(v) => updateField(q.id, 'question', v)}
                        multiline
                      />

                      {q.options.map((opt, oi) => (
                        <View key={oi}>
                          <Text style={styles.fieldLabel}>
                            Option {optionLabels[oi]}
                            {oi === q.correctIndex ? ' (correct)' : ''}
                          </Text>
                          <TextInput
                            style={styles.editInput}
                            value={opt}
                            onChangeText={(v) => updateOption(q.id, oi, v)}
                          />
                        </View>
                      ))}

                      <Text style={styles.fieldLabel}>
                        Correct option (0–3)
                      </Text>
                      <TextInput
                        style={styles.editInput}
                        value={String(q.correctIndex)}
                        onChangeText={(v) => {
                          const n = parseInt(v, 10);
                          if (!isNaN(n) && n >= 0 && n <= 3) {
                            updateField(q.id, 'correctIndex', n);
                          }
                        }}
                        keyboardType="numeric"
                      />

                      <Text style={styles.fieldLabel}>Hint (optional)</Text>
                      <TextInput
                        style={styles.editInput}
                        value={q.hint ?? ''}
                        onChangeText={(v) =>
                          updateField(q.id, 'hint', v || undefined)
                        }
                      />

                      <Text style={styles.fieldLabel}>
                        Explanation (optional)
                      </Text>
                      <TextInput
                        style={styles.editInput}
                        value={q.explanation ?? ''}
                        onChangeText={(v) =>
                          updateField(q.id, 'explanation', v || undefined)
                        }
                        multiline
                      />

                      {saveError && (
                        <Text style={styles.errorTextInline}>{saveError}</Text>
                      )}

                      <View style={styles.editActions}>
                        <TouchableOpacity
                          style={styles.saveButton}
                          onPress={() => saveEdit(q.id)}
                        >
                          <Text style={styles.saveButtonText}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={() => toggleEdit(q.id)}
                        >
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    /* ── Display mode ── */
                    <View>
                      <View style={styles.cardHeader}>
                        <Text style={styles.questionNumber}>
                          #{q.id + 1}
                        </Text>
                        <View style={styles.cardActions}>
                          <TouchableOpacity
                            style={styles.editBtn}
                            onPress={() => toggleEdit(q.id)}
                          >
                            <Text style={styles.editBtnText}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.removeBtn}
                            onPress={() => removeQuestion(q.id)}
                          >
                            <Text style={styles.removeBtnText}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <Text style={styles.questionDisplayText}>
                        {q.question}
                      </Text>

                      {q.options.map((opt, oi) => (
                        <Text
                          key={oi}
                          style={[
                            styles.optionDisplayText,
                            oi === q.correctIndex && styles.correctOption,
                          ]}
                        >
                          {optionLabels[oi]}) {opt}
                          {oi === q.correctIndex ? ' ✓' : ''}
                        </Text>
                      ))}

                      {q.hint && (
                        <Text style={styles.metaText}>
                          Hint: {q.hint}
                        </Text>
                      )}
                      {q.explanation && (
                        <Text style={styles.metaText}>
                          Explanation: {q.explanation}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              ))}

              {/* Publish error */}
              {publishError && (
                <Text style={styles.errorTextInline}>{publishError}</Text>
              )}

              {/* Publish button */}
              <TouchableOpacity
                style={[
                  styles.publishButton,
                  publishing && styles.buttonDisabled,
                ]}
                onPress={handlePublish}
                disabled={publishing || parsedQuestions.length === 0}
              >
                {publishing ? (
                  <View style={styles.publishingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.publishButtonText}>
                      {' '}Publishing...
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.publishButtonText}>
                    Publish {parsedQuestions.length} Question
                    {parsedQuestions.length !== 1 ? 's' : ''}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.xxl,
  },
  backButton: {
    marginBottom: spacing.md,
  },
  backText: {
    ...typography.body,
    color: colors.primary,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  textarea: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 180,
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  errorTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.error,
    marginBottom: spacing.sm,
  },
  errorItem: {
    ...typography.caption,
    color: colors.error,
    marginBottom: spacing.xs,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  questionCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  questionNumber: {
    ...typography.caption,
    color: colors.textTertiary,
    fontWeight: '600',
  },
  editBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  removeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.error,
  },
  removeBtnText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '600',
  },
  questionDisplayText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  optionDisplayText: {
    ...typography.body,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    marginBottom: 2,
  },
  correctOption: {
    color: colors.success,
    fontWeight: '600',
  },
  metaText: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  errorTextInline: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  // -- Edit mode fields --
  fieldLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  editInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    padding: spacing.sm,
    ...typography.body,
    color: colors.textPrimary,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  // -- Publish button --
  publishButton: {
    backgroundColor: colors.success,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  publishButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 17,
  },
  publishingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
