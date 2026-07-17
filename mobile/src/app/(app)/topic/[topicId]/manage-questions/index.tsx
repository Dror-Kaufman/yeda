import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../../../../utils/supabase';
import { colors, spacing, typography } from '../../../../../constants/theme';
import { useSession } from '../../../../../utils/auth-context';
import ConfirmDialog from '../../../../../components/ui/ConfirmDialog';

// ── Types ──────────────────────────────────────────────────────────

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  hint: string | null;
  explanation: string | null;
  status: 'draft' | 'published';
  created_at: string;
}

// ── Component ──────────────────────────────────────────────────────

export default function ManageQuestionsScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const { profile } = useSession();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [topicName, setTopicName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Question | null>(null);

  const canManage = profile?.role === 'teacher' || profile?.role === 'admin';

  async function fetchQuestions() {
    try {
      const [topicResult, questionsResult] = await Promise.all([
        supabase.from('topics').select('name').eq('id', topicId).single(),
        supabase
          .from('questions')
          .select('*')
          .eq('topic_id', topicId)
          .order('created_at', { ascending: false }),
      ]);

      if (topicResult.error) throw topicResult.error;
      if (questionsResult.error) throw questionsResult.error;

      setTopicName(topicResult.data.name);
      setQuestions(questionsResult.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (topicId) fetchQuestions();
  }, [topicId]);

  const handleDelete = (q: Question) => {
    setDeleteConfirm(q);
  };

  const confirmDeleteQuestion = async () => {
    if (!deleteConfirm) return;
    setDeleting(deleteConfirm.id);
    const qId = deleteConfirm.id;
    setDeleteConfirm(null);
    const { error: delErr } = await supabase
      .from('questions')
      .delete()
      .eq('id', qId);
    if (delErr) {
      console.error('Failed to delete question:', delErr);
    } else {
      setQuestions((prev) => prev.filter((x) => x.id !== qId));
    }
    setDeleting(null);
  };

  // ── Loading / Error ──────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchQuestions}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render ───────────────────────────────────────────────────────

  const publishedQuestions = questions.filter((q) => q.status === 'published');
  const draftQuestions = questions.filter((q) => q.status === 'draft');
  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>{'\u2190'} Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          {topicName ? `Questions — ${topicName}` : 'Manage Questions'}
        </Text>

        {canManage && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push(`/topic/${topicId}/manage-questions/paste`)}
          >
            <Text style={styles.addButtonText}>+ Add MCQ Bank</Text>
          </TouchableOpacity>
        )}

        {/* Published questions */}
        {publishedQuestions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Published ({publishedQuestions.length})
            </Text>
            {publishedQuestions.map((q) => (
              <View key={q.id} style={styles.questionCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.questionText}>{q.question_text}</Text>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(q)}
                    disabled={deleting === q.id}
                  >
                    <Text style={styles.deleteButtonText}>
                      {deleting === q.id ? '...' : 'Delete'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {q.options.map((opt, i) => (
                  <Text
                    key={i}
                    style={[
                      styles.optionText,
                      i === q.correct_index && styles.correctOption,
                    ]}
                  >
                    {optionLabels[i]}) {opt}
                    {i === q.correct_index ? ' ✓' : ''}
                  </Text>
                ))}
                {q.hint && (
                  <Text style={styles.metaText}>Hint: {q.hint}</Text>
                )}
                {q.explanation && (
                  <Text style={styles.metaText}>
                    Explanation: {q.explanation}
                  </Text>
                )}
                <Text style={styles.statusBadge}>{q.status}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Draft questions */}
        {draftQuestions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Draft ({draftQuestions.length})
            </Text>
            {draftQuestions.map((q) => (
              <View key={q.id} style={styles.questionCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.questionText}>{q.question_text}</Text>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(q)}
                    disabled={deleting === q.id}
                  >
                    <Text style={styles.deleteButtonText}>
                      {deleting === q.id ? '...' : 'Delete'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.statusBadge}>{q.status}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Empty state */}
        {questions.length === 0 && (
          <View style={styles.emptySection}>
            <Text style={styles.emptyTitle}>No questions yet</Text>
            <Text style={styles.emptySubtitle}>
              Click "Add MCQ Bank" to paste questions generated by an LLM.
            </Text>
          </View>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={deleteConfirm !== null}
        title="Delete Question"
        message={
          deleteConfirm
            ? `Are you sure you want to delete this question?\n\n"${deleteConfirm.question_text.substring(0, 100)}${deleteConfirm.question_text.length > 100 ? '...' : ''}"`
            : ''
        }
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={confirmDeleteQuestion}
        loading={deleting !== null}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.xxl,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    marginBottom: spacing.md,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  retryButtonText: {
    color: colors.primary,
    fontWeight: '600',
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
    marginBottom: spacing.lg,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  section: {
    marginBottom: spacing.lg,
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
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  questionText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  optionText: {
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
  statusBadge: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.error,
  },
  deleteButtonText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '600',
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
