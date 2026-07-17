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
import { useSession } from '../../../../../utils/auth-context';
import { colors, spacing, typography } from '../../../../../constants/theme';

// ── Types ──────────────────────────────────────────────────────────

interface AnswerRecord {
  questionId: string;
  questionText: string;
  options: string[];
  selectedIndex: number | null;
  correctIndex: number;
  explanation: string | null;
}

interface ExamAttempt {
  id: string;
  user_id: string;
  topic_id: string;
  score: number;
  answers: AnswerRecord[];
  started_at: string;
  completed_at: string;
}

// ── Component ──────────────────────────────────────────────────────

export default function ExamHistoryScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const { session } = useSession();

  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [topicName, setTopicName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      if (!session?.user?.id) {
        if (!mounted) return;
        setLoading(false);
        return;
      }

      const [topicResult, attemptsResult] = await Promise.all([
        supabase.from('topics').select('name').eq('id', topicId).single(),
        supabase
          .from('exam_attempts')
          .select('*')
          .eq('topic_id', topicId)
          .eq('user_id', session.user.id)
          .order('completed_at', { ascending: false }),
      ]);

      if (!mounted) return;

      if (!topicResult.error) {
        setTopicName(topicResult.data.name);
      }

      if (attemptsResult.error) {
        setError(attemptsResult.error.message);
      } else {
        setAttempts(attemptsResult.data as ExamAttempt[]);
      }

      setLoading(false);
    }

    fetchData();

    return () => {
      mounted = false;
    };
  }, [topicId, session?.user?.id]);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  const optionLabels = ['A', 'B', 'C', 'D'];

  // ── Loading ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Back button */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>{'\u2190'} Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <Text style={styles.title}>Exam History</Text>
        {topicName && (
          <Text style={styles.subtitle}>{topicName}</Text>
        )}

        {attempts.length === 0 ? (
          /* ── Empty state ──────────────────────────────────────── */
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No exam attempts yet</Text>
            <Text style={styles.emptySubtitle}>
              Complete an exam to see your results here.
            </Text>
            <TouchableOpacity
              style={styles.startExamButton}
              onPress={() => router.push(`/topic/${topicId}/exam`)}
            >
              <Text style={styles.startExamButtonText}>Start an Exam</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ── Attempt list ─────────────────────────────────────── */
          attempts.map((attempt) => {
            const totalQuestions = attempt.answers?.length ?? 0;
            const correctCount =
              totalQuestions > 0
                ? Math.round((attempt.score / 100) * totalQuestions)
                : 0;
            const isExpanded = expandedId === attempt.id;
            const scoreColor =
              attempt.score >= 60 ? colors.success : colors.error;

            return (
              <TouchableOpacity
                key={attempt.id}
                style={styles.attemptCard}
                onPress={() => toggleExpand(attempt.id)}
                activeOpacity={0.7}
              >
                {/* Score summary row */}
                <View style={styles.attemptHeader}>
                  <View style={styles.attemptScoreSection}>
                    <Text style={[styles.attemptScore, { color: scoreColor }]}>
                      {attempt.score}%
                    </Text>
                    <Text style={styles.attemptCorrectCount}>
                      {correctCount}/{totalQuestions} correct
                    </Text>
                  </View>
                  <View style={styles.attemptMetaSection}>
                    <Text style={styles.attemptDate}>
                      {new Date(attempt.completed_at).toLocaleDateString()}
                    </Text>
                    <Text style={styles.reviewToggleLabel}>
                      {isExpanded ? 'Collapse' : 'Review'}
                    </Text>
                  </View>
                </View>

                {/* ── Expanded question breakdown ────────────────── */}
                {isExpanded &&
                  attempt.answers.map((a, i) => (
                    <View key={a.questionId} style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        <Text style={styles.reviewQuestionNum}>
                          Question {i + 1}
                        </Text>
                        {a.selectedIndex === a.correctIndex ? (
                          <Text style={styles.reviewCorrect}>Correct</Text>
                        ) : (
                          <Text style={styles.reviewWrong}>Incorrect</Text>
                        )}
                      </View>

                      <Text style={styles.reviewQuestionText}>
                        {a.questionText}
                      </Text>

                      {a.options.map((opt, oi) => {
                        let optStyle: any = styles.reviewOption;
                        let labelStyle: any = styles.reviewOptionText;

                        if (oi === a.correctIndex) {
                          optStyle = [
                            styles.reviewOption,
                            styles.reviewOptionCorrect,
                          ];
                          labelStyle = [
                            styles.reviewOptionText,
                            styles.reviewOptionTextCorrect,
                          ];
                        } else if (
                          oi === a.selectedIndex &&
                          a.selectedIndex !== a.correctIndex
                        ) {
                          optStyle = [
                            styles.reviewOption,
                            styles.reviewOptionWrong,
                          ];
                          labelStyle = [
                            styles.reviewOptionText,
                            styles.reviewOptionTextWrong,
                          ];
                        }

                        return (
                          <View key={oi} style={optStyle}>
                            <Text style={labelStyle}>
                              {optionLabels[oi]}) {opt}
                              {oi === a.correctIndex ? ' \u2713' : ''}
                            </Text>
                          </View>
                        );
                      })}

                      {a.explanation && (
                        <View style={styles.reviewExplanation}>
                          <Text style={styles.reviewExplanationLabel}>
                            Explanation:
                          </Text>
                          <Text style={styles.reviewExplanationText}>
                            {a.explanation}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
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
    textAlign: 'center',
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
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },

  // ── Empty state ──────────────────────────────────────────────────
  emptyContainer: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  startExamButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
  },
  startExamButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },

  // ── Attempt card ─────────────────────────────────────────────────
  attemptCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  attemptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attemptScoreSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  attemptScore: {
    fontSize: 28,
    fontWeight: '700',
  },
  attemptCorrectCount: {
    ...typography.body,
    color: colors.textSecondary,
  },
  attemptMetaSection: {
    alignItems: 'flex-end',
  },
  attemptDate: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  reviewToggleLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.primary,
  },

  // ── Review question breakdown (mirrors session.tsx) ──────────────
  reviewCard: {
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  reviewQuestionNum: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  reviewCorrect: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.success,
  },
  reviewWrong: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.error,
  },
  reviewQuestionText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  reviewOption: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: 4,
    marginBottom: 2,
  },
  reviewOptionCorrect: {
    backgroundColor: '#F0FDF4',
  },
  reviewOptionWrong: {
    backgroundColor: '#FEF2F2',
  },
  reviewOptionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  reviewOptionTextCorrect: {
    color: colors.success,
    fontWeight: '600',
  },
  reviewOptionTextWrong: {
    color: colors.error,
    fontWeight: '600',
  },
  reviewExplanation: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  reviewExplanationLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 2,
  },
  reviewExplanationText: {
    ...typography.body,
    color: '#1E3A5F',
  },
});
