import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeBack } from '../../../../../utils/useSafeBack';
import { supabase } from '../../../../../utils/supabase';
import { useSession } from '../../../../../utils/auth-context';
import { colors, spacing, typography } from '../../../../../constants/theme';

// ── Types ──────────────────────────────────────────────────────────

interface ExamQuestion {
  id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  hint: string | null;
  explanation: string | null;
}

interface AnswerRecord {
  questionId: string;
  questionText: string;
  options: string[];
  selectedIndex: number | null;
  correctIndex: number;
  explanation: string | null;
}

type Phase = 'exam' | 'submitted';

// ── Helpers ────────────────────────────────────────────────────────

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Component ──────────────────────────────────────────────────────

export default function ExamSessionScreen() {
  const { topicId, count, time } = useLocalSearchParams<{
    topicId: string;
    count: string;
    time: string;
  }>();
  const { session: authSession } = useSession();
  const goBack = useSafeBack(`/topic/${topicId}`);

  const questionCount = Math.min(parseInt(count ?? '10', 10) || 10, 200);
  const timeLimitMinutes = parseInt(time ?? '10', 10) || 10;

  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeRemaining, setTimeRemaining] = useState(timeLimitMinutes * 60);
  const [phase, setPhase] = useState<Phase>('exam');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    total: number;
    percentage: number;
    answers: AnswerRecord[];
  } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<string>(new Date().toISOString());

  // ── Fetch questions ──────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;

    async function fetchQuestions() {
      const { data, error: fetchError } = await supabase
        .from('questions')
        .select('id, question_text, options, correct_index, hint, explanation')
        .eq('topic_id', topicId)
        .eq('status', 'published');

      if (!mounted) return;

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      const typedData = (data ?? []) as ExamQuestion[];
      const shuffled = shuffleArray(typedData).slice(0, questionCount);
      setQuestions(shuffled);
      setLoading(false);
    }

    fetchQuestions();
    return () => {
      mounted = false;
    };
  }, [topicId, questionCount]);

  // ── Timer ────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'exam' || loading) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Auto-submit when time runs out
          if (timerRef.current) clearInterval(timerRef.current);
          // Use setTimeout to avoid state update during render
          setTimeout(() => handleSubmit(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, loading]);

  // ── Actions ──────────────────────────────────────────────────────

  const handleSelectOption = useCallback(
    (optionIndex: number) => {
      if (phase !== 'exam') return;
      setAnswers((prev) => ({ ...prev, [currentIndex]: optionIndex }));
    },
    [phase, currentIndex],
  );

  const handleSubmit = useCallback(async () => {
    if (phase === 'submitted' || submitting) return;
    setSubmitting(true);

    // Stop the timer
    if (timerRef.current) clearInterval(timerRef.current);

    // Calculate score
    const answerRecords: AnswerRecord[] = questions.map((q, i) => ({
      questionId: q.id,
      questionText: q.question_text,
      options: q.options,
      selectedIndex: answers[i] ?? null,
      correctIndex: q.correct_index,
      explanation: q.explanation,
    }));

    const correct = answerRecords.filter(
      (a) => a.selectedIndex === a.correctIndex,
    ).length;
    const total = questions.length;
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

    setResult({ score: correct, total, percentage, answers: answerRecords });
    setPhase('submitted');

    // Save to exam_attempts (fire-and-forget, don't block UI)
    if (authSession?.user) {
      const completedAt = new Date().toISOString();
      await supabase.from('exam_attempts').insert({
        user_id: authSession.user.id,
        topic_id: topicId,
        score: percentage,
        answers: JSON.parse(JSON.stringify(answerRecords)),
        started_at: startedAtRef.current,
        completed_at: completedAt,
      });
    }

    setSubmitting(false);
  }, [phase, submitting, questions, answers, authSession, topicId]);

  // ── Render helpers ───────────────────────────────────────────────

  const optionLabels = ['A', 'B', 'C', 'D'];
  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex];
  const selectedAnswer = answers[currentIndex];
  const isFirstQuestion = currentIndex === 0;
  const isLastQuestion = currentIndex >= totalQuestions - 1;

  // Count answered questions
  const answeredCount = Object.keys(answers).length;

  // ── Loading / Error / Empty ──────────────────────────────────────

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
        <TouchableOpacity
          style={styles.retryButton}
onPress={goBack}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!currentQuestion) {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>No questions found.</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={goBack}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Submitted results view ───────────────────────────────────────

  if (phase === 'submitted' && result) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.resultTitle}>Exam Complete</Text>

          <View style={styles.scoreCard}>
            <Text
              style={[
                styles.scorePercentage,
                { color: result.percentage >= 60 ? colors.success : colors.error },
              ]}
            >
              {result.percentage}%
            </Text>
            <Text style={styles.scoreDetail}>
              {result.score} / {result.total} correct
            </Text>
          </View>

          {result.answers.map((a, i) => (
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
                  optStyle = [styles.reviewOption, styles.reviewOptionCorrect];
                  labelStyle = [
                    styles.reviewOptionText,
                    styles.reviewOptionTextCorrect,
                  ];
                } else if (
                  oi === a.selectedIndex &&
                  a.selectedIndex !== a.correctIndex
                ) {
                  optStyle = [styles.reviewOption, styles.reviewOptionWrong];
                  labelStyle = [
                    styles.reviewOptionText,
                    styles.reviewOptionTextWrong,
                  ];
                }

                return (
                  <View key={oi} style={optStyle}>
                    <Text style={labelStyle}>
                      {optionLabels[oi]}) {opt}
                      {oi === a.correctIndex ? ' ✓' : ''}
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

          <TouchableOpacity
            style={styles.backToTopicButton}
            onPress={goBack}
          >
            <Text style={styles.backToTopicButtonText}>
              Back to Topic
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Exam in progress ─────────────────────────────────────────────

  const isTimeLow = timeRemaining < 120; // less than 2 minutes
  const allAnswered = answeredCount >= totalQuestions;

  // Build navigation dots
  const navDots = questions.map((_, i) => {
    const isAnswered = i in answers;
    const isCurrent = i === currentIndex;
    return { index: i, isAnswered, isCurrent };
  });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Timer bar */}
        <View
          style={[
            styles.timerBar,
            isTimeLow && styles.timerBarLow,
          ]}
        >
          <Text
            style={[
              styles.timerText,
              isTimeLow && styles.timerTextLow,
            ]}
          >
            {formatTime(timeRemaining)}
          </Text>
        </View>

        {/* Question nav dots */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.navDotsRow}
        >
          {navDots.map((dot) => (
            <TouchableOpacity
              key={dot.index}
              style={[
                styles.navDot,
                dot.isCurrent && styles.navDotCurrent,
                dot.isAnswered && styles.navDotAnswered,
              ]}
              onPress={() => setCurrentIndex(dot.index)}
            >
              <Text
                style={[
                  styles.navDotText,
                  (dot.isCurrent || dot.isAnswered) &&
                    styles.navDotTextActive,
                ]}
              >
                {dot.index + 1}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Progress */}
        <Text style={styles.progressText}>
          Question {currentIndex + 1} of {totalQuestions}
          {'  \u2022  '}
          {answeredCount} answered
        </Text>

        {/* Question */}
        <View style={styles.questionCard}>
          <Text style={styles.questionText}>
            {currentQuestion.question_text}
          </Text>
        </View>

        {/* Options */}
        {currentQuestion.options.map((opt, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.optionCard,
              selectedAnswer === i && styles.optionSelected,
            ]}
            onPress={() => handleSelectOption(i)}
          >
            <Text
              style={[
                styles.optionText,
                selectedAnswer === i && styles.optionTextSelected,
              ]}
            >
              {optionLabels[i]}) {opt}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Navigation */}
        <View style={styles.navRow}>
          {!isFirstQuestion && (
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => setCurrentIndex((i) => i - 1)}
            >
              <Text style={styles.navButtonText}>{'\u2190'} Previous</Text>
            </TouchableOpacity>
          )}

          {isLastQuestion ? (
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!allAnswered || submitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? 'Submitting...' : 'Submit Exam'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => setCurrentIndex((i) => i + 1)}
            >
              <Text style={styles.navButtonText}>Next {'\u2192'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {isLastQuestion && !allAnswered && (
          <Text style={styles.unansweredWarning}>
            You have {totalQuestions - answeredCount} unanswered question
            {totalQuestions - answeredCount !== 1 ? 's' : ''}.
          </Text>
        )}

        {/* Submit early option */}
        {!isLastQuestion && answeredCount > 0 && (
          <TouchableOpacity
            style={styles.earlySubmitLink}
            onPress={handleSubmit}
          >
            <Text style={styles.earlySubmitText}>
              Submit exam now ({answeredCount}/{totalQuestions} answered)
            </Text>
          </TouchableOpacity>
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

  // ── Timer ────────────────────────────────────────────────────────
  timerBar: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  timerBarLow: {
    backgroundColor: colors.error,
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timerTextLow: {
    color: '#FFFFFF',
  },

  // ── Nav dots ─────────────────────────────────────────────────────
  navDotsRow: {
    marginBottom: spacing.sm,
  },
  navDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    backgroundColor: colors.card,
  },
  navDotCurrent: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  navDotAnswered: {
    borderColor: colors.success,
    backgroundColor: '#F0FDF4',
  },
  navDotText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  navDotTextActive: {
    color: '#FFFFFF',
  },

  // ── Progress ─────────────────────────────────────────────────────
  progressText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },

  // ── Question ─────────────────────────────────────────────────────
  questionCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  questionText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 26,
  },

  // ── Options ──────────────────────────────────────────────────────
  optionCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  optionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },

  // ── Nav row ──────────────────────────────────────────────────────
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  navButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 15,
  },
  submitButton: {
    flex: 1,
    backgroundColor: colors.success,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  unansweredWarning: {
    ...typography.caption,
    color: colors.warning,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  earlySubmitLink: {
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  earlySubmitText: {
    ...typography.caption,
    color: colors.textTertiary,
    textDecorationLine: 'underline',
  },

  // ── Results ─────────────────────────────────────────────────────
  resultTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  scoreCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  scorePercentage: {
    fontSize: 48,
    fontWeight: '700',
  },
  scoreDetail: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  reviewCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
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
  backToTopicButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
  },
  backToTopicButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
