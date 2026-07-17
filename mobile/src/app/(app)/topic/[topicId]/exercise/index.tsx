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

export default function ExerciseIntroScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const [topicName, setTopicName] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCount, setSelectedCount] = useState<CountOption>(10);

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
      `/topic/${topicId}/exercise/session?count=${Math.min(count, totalCount)}`,
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

        <Text style={styles.title}>Exercise Mode</Text>
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
            <Text style={styles.prompt}>How many questions?</Text>

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

            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStart}
            >
              <Text style={styles.startButtonText}>Start Exercise</Text>
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
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
