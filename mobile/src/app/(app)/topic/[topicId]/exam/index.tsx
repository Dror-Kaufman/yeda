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

type CountOption = 5 | 10 | 20 | 'all';

const COUNT_OPTIONS: { label: string; value: CountOption }[] = [
  { label: '5 questions', value: 5 },
  { label: '10 questions', value: 10 },
  { label: '20 questions', value: 20 },
  { label: 'All questions', value: 'all' },
];

const TIME_OPTIONS: { label: string; minutes: number }[] = [
  { label: '5 minutes', minutes: 5 },
  { label: '10 minutes', minutes: 10 },
  { label: '15 minutes', minutes: 15 },
  { label: '30 minutes', minutes: 30 },
  { label: '60 minutes', minutes: 60 },
];

export default function ExamIntroScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const [topicName, setTopicName] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCount, setSelectedCount] = useState<CountOption>(10);
  const [selectedTime, setSelectedTime] = useState<number>(10); // minutes

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      const [topicResult, countResult] = await Promise.all([
        supabase.from('topics').select('name').eq('id', topicId).single(),
        supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('topic_id', topicId)
          .eq('status', 'published'),
      ]);

      if (!mounted) return;

      if (!topicResult.error) {
        setTopicName(topicResult.data.name);
      }
      setTotalCount(countResult.count ?? 0);
      setLoading(false);
    }

    fetchData();
    return () => {
      mounted = false;
    };
  }, [topicId]);

  function handleStart() {
    const count =
      selectedCount === 'all' ? totalCount : selectedCount;
    router.push(
      `/topic/${topicId}/exam/session?count=${Math.min(count, totalCount)}&time=${selectedTime}`,
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const canStart = totalCount > 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>{'\u2190'} Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Exam Mode</Text>
        {topicName && (
          <Text style={styles.subtitle}>{topicName}</Text>
        )}

        <Text style={styles.countLabel}>
          {totalCount > 0
            ? `${totalCount} question${totalCount !== 1 ? 's' : ''} available`
            : 'No questions available'}
        </Text>

        {totalCount > 0 && (
          <>
            {/* Question count selection */}
            <Text style={styles.prompt}>Number of questions</Text>
            {COUNT_OPTIONS.map((opt) => {
              const isDisabled =
                opt.value !== 'all' &&
                typeof opt.value === 'number' &&
                opt.value > totalCount;
              const isSelected = selectedCount === opt.value;

              return (
                <TouchableOpacity
                  key={opt.label}
                  style={[
                    styles.optionCard,
                    isSelected && styles.optionCardSelected,
                    isDisabled && styles.optionCardDisabled,
                  ]}
                  onPress={() => !isDisabled && setSelectedCount(opt.value)}
                  disabled={isDisabled}
                >
                  <Text
                    style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected,
                      isDisabled && styles.optionTextDisabled,
                    ]}
                  >
                    {opt.label}
                    {opt.value === 'all' ? ` (${totalCount})` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Time limit selection */}
            <Text style={[styles.prompt, { marginTop: spacing.xl }]}>
              Time limit
            </Text>
            {TIME_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.label}
                style={[
                  styles.optionCard,
                  selectedTime === opt.minutes && styles.optionCardSelected,
                ]}
                onPress={() => setSelectedTime(opt.minutes)}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedTime === opt.minutes && styles.optionTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                No hints will be available during the exam. Your answers will be
                scored after submission and you'll be able to review
                explanations.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStart}
            >
              <Text style={styles.startButtonText}>Start Exam</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.historyLink}
              onPress={() => router.push(`/topic/${topicId}/exam/history`)}
            >
              <Text style={styles.historyLinkText}>View Past Results</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

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
  countLabel: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  prompt: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  optionCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  optionCardDisabled: {
    opacity: 0.4,
  },
  optionText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  optionTextDisabled: {
    color: colors.textTertiary,
  },
  warningBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  warningText: {
    ...typography.caption,
    color: '#92400E',
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  historyLink: {
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  historyLinkText: {
    ...typography.body,
    color: colors.textTertiary,
    textDecorationLine: 'underline',
  },
});
