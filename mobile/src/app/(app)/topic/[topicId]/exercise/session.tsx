import { useEffect, useState, useCallback } from 'react';
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
import { colors, spacing, typography } from '../../../../../constants/theme';

// ── Types ──────────────────────────────────────────────────────────

interface ExerciseQuestion {
  id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  hint: string | null;
  explanation: string | null;
}

type AnswerState =
  | { phase: 'answering'; showHint: boolean }
  | {
      phase: 'answered';
      selectedIndex: number;
      showHint: boolean;
      showExplanation: boolean;
    };

// ── Helpers ────────────────────────────────────────────────────────

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ── Component ──────────────────────────────────────────────────────

export default function ExerciseSessionScreen() {
  const { topicId, count } = useLocalSearchParams<{
    topicId: string;
    count: string;
  }>();
  const goBack = useSafeBack(`/topic/${topicId}/exercise`);
  const questionCount = Math.min(parseInt(count ?? '10', 10) || 10, 200);

  const [questions, setQuestions] = useState<ExerciseQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tracks answer state per question index
  const [answerStates, setAnswerStates] = useState<
    Record<number, AnswerState>
  >({});

  // ── Fetch questions on mount ─────────────────────────────────────

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

      const typedData = (data ?? []) as ExerciseQuestion[];
      const shuffled = shuffleArray(typedData).slice(0, questionCount);
      setQuestions(shuffled);
      setLoading(false);
    }

    fetchQuestions();
    return () => {
      mounted = false;
    };
  }, [topicId, questionCount]);

  // ── Current state ────────────────────────────────────────────────

  const currentQuestion = questions[currentIndex];
  const currentState: AnswerState | undefined = answerStates[currentIndex];
  const isAnswered = currentState?.phase === 'answered';
  const totalQuestions = questions.length;
  const isLastQuestion = currentIndex >= totalQuestions - 1;

  // ── Actions ──────────────────────────────────────────────────────

  const handleShowHint = useCallback(() => {
    setAnswerStates((prev) => {
      const existing = prev[currentIndex];
      if (existing?.phase === 'answering') {
        return {
          ...prev,
          [currentIndex]: { ...existing, showHint: true },
        };
      }
      if (existing?.phase === 'answered') {
        return {
          ...prev,
          [currentIndex]: { ...existing, showHint: true },
        };
      }
      return {
        ...prev,
        [currentIndex]: { phase: 'answering', showHint: true },
      };
    });
  }, [currentIndex]);

  const handleSelectOption = useCallback(
    (optionIndex: number) => {
      if (isAnswered) return;
      setAnswerStates((prev) => ({
        ...prev,
        [currentIndex]: {
          phase: 'answered',
          selectedIndex: optionIndex,
          showHint: prev[currentIndex]?.phase === 'answering'
            ? prev[currentIndex].showHint
            : false,
          showExplanation: false,
        },
      }));
    },
    [currentIndex, isAnswered],
  );

  const handleShowExplanation = useCallback(() => {
    setAnswerStates((prev) => {
      const existing = prev[currentIndex];
      if (existing?.phase === 'answered') {
        return {
          ...prev,
          [currentIndex]: { ...existing, showExplanation: true },
        };
      }
      return prev;
    });
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (isLastQuestion) {
      goBack();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [isLastQuestion, goBack]);

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

  // ── Render helpers ───────────────────────────────────────────────

  const optionLabels = ['A', 'B', 'C', 'D'];
  const correctIndex = currentQuestion.correct_index;
  const hasHint = !!currentQuestion.hint;
  const hasExplanation = !!currentQuestion.explanation;
  const hintRevealed = currentState?.showHint ?? false;
  const explanationRevealed =
    currentState?.phase === 'answered' && currentState.showExplanation;
  const selectedIndex =
    currentState?.phase === 'answered'
      ? currentState.selectedIndex
      : null;

  function getOptionStyle(optionIdx: number) {
    if (!isAnswered) {
      return styles.optionCard;
    }

    if (optionIdx === correctIndex) {
      return [styles.optionCard, styles.optionCorrect];
    }

    if (optionIdx === selectedIndex && optionIdx !== correctIndex) {
      return [styles.optionCard, styles.optionWrong];
    }

    return [styles.optionCard, styles.optionDimmed];
  }

  function getOptionTextStyle(optionIdx: number) {
    if (!isAnswered) return styles.optionText;
    if (optionIdx === correctIndex) return [styles.optionText, styles.optionTextCorrect];
    if (optionIdx === selectedIndex && optionIdx !== correctIndex)
      return [styles.optionText, styles.optionTextWrong];
    return [styles.optionText, styles.optionTextDimmed];
  }

  const isAnswerCorrect =
    isAnswered && selectedIndex === correctIndex;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Back button */}
        <TouchableOpacity
          onPress={goBack}
          style={styles.backButton}
        >
          <Text style={styles.backText}>{'\u2190'} Exit</Text>
        </TouchableOpacity>

        {/* Progress */}
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            Question {currentIndex + 1} of {totalQuestions}
          </Text>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${
                    ((currentIndex + 1) / totalQuestions) * 100
                  }%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Question */}
        <View style={styles.questionCard}>
          <Text style={styles.questionText}>
            {currentQuestion.question_text}
          </Text>
        </View>

        {/* Hint */}
        {hasHint && !hintRevealed && !isAnswered && (
          <TouchableOpacity
            style={styles.hintButton}
            onPress={handleShowHint}
          >
            <Text style={styles.hintButtonText}>Show Hint</Text>
          </TouchableOpacity>
        )}

        {hintRevealed && (
          <View style={styles.hintBox}>
            <Text style={styles.hintLabel}>Hint:</Text>
            <Text style={styles.hintText}>{currentQuestion.hint}</Text>
          </View>
        )}

        {/* Options */}
        {currentQuestion.options.map((opt, i) => (
          <TouchableOpacity
            key={i}
            style={getOptionStyle(i)}
            onPress={() => handleSelectOption(i)}
            disabled={isAnswered}
          >
            <Text style={getOptionTextStyle(i)}>
              {optionLabels[i]}) {opt}
              {isAnswered && i === correctIndex ? ' ✓' : ''}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Result feedback */}
        {isAnswered && (
          <View
            style={[
              styles.feedbackBox,
              isAnswerCorrect
                ? styles.feedbackCorrect
                : styles.feedbackWrong,
            ]}
          >
            <Text style={styles.feedbackText}>
              {isAnswerCorrect ? 'Correct!' : 'Incorrect'}
            </Text>
          </View>
        )}

        {/* Explanation (after answer) */}
        {isAnswered && hasExplanation && !explanationRevealed && (
          <TouchableOpacity
            style={styles.explanationButton}
            onPress={handleShowExplanation}
          >
            <Text style={styles.explanationButtonText}>
              Show Explanation
            </Text>
          </TouchableOpacity>
        )}

        {explanationRevealed && (
          <View style={styles.explanationBox}>
            <Text style={styles.explanationLabel}>Explanation:</Text>
            <Text style={styles.explanationText}>
              {currentQuestion.explanation}
            </Text>
          </View>
        )}

        {/* Next / Finish */}
        {isAnswered && (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>
              {isLastQuestion ? 'Finish Exercise' : 'Next Question'}
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
  backButton: {
    marginBottom: spacing.md,
  },
  backText: {
    ...typography.body,
    color: colors.primary,
  },

  // ── Progress ───────────────────────────────────────────────────
  progressRow: {
    marginBottom: spacing.lg,
  },
  progressText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.cardBorder,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },

  // ── Question ────────────────────────────────────────────────────
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

  // ── Hint ────────────────────────────────────────────────────────
  hintButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.warning,
    marginBottom: spacing.md,
  },
  hintButtonText: {
    color: colors.warning,
    fontWeight: '600',
    fontSize: 14,
  },
  hintBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  hintLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  hintText: {
    ...typography.body,
    color: '#92400E',
  },

  // ── Options ─────────────────────────────────────────────────────
  optionCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  optionCorrect: {
    borderColor: colors.success,
    backgroundColor: '#F0FDF4',
  },
  optionWrong: {
    borderColor: colors.error,
    backgroundColor: '#FEF2F2',
  },
  optionDimmed: {
    opacity: 0.5,
  },
  optionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  optionTextCorrect: {
    color: colors.success,
    fontWeight: '600',
  },
  optionTextWrong: {
    color: colors.error,
    fontWeight: '600',
  },
  optionTextDimmed: {
    color: colors.textTertiary,
  },

  // ── Feedback ────────────────────────────────────────────────────
  feedbackBox: {
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  feedbackCorrect: {
    backgroundColor: '#F0FDF4',
  },
  feedbackWrong: {
    backgroundColor: '#FEF2F2',
  },
  feedbackText: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 18,
  },

  // ── Explanation ─────────────────────────────────────────────────
  explanationButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: spacing.md,
  },
  explanationButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  explanationBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  explanationLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 2,
  },
  explanationText: {
    ...typography.body,
    color: '#1E3A5F',
  },

  // ── Next / Finish ───────────────────────────────────────────────
  nextButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
