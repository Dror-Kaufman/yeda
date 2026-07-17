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

// ── Types ──────────────────────────────────────────────────────────

interface StudyMaterial {
  id: string;
  title: string;
  description: string | null;
  google_docs_url: string;
}

// ── Component ──────────────────────────────────────────────────────

export default function StudyMaterialsScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const [topicName, setTopicName] = useState<string | null>(null);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      const [topicResult, materialsResult] = await Promise.all([
        supabase.from('topics').select('name').eq('id', topicId).single(),
        supabase
          .from('study_materials')
          .select('id, title, description, google_docs_url')
          .eq('topic_id', topicId),
      ]);

      if (!mounted) return;

      if (topicResult.error) {
        setError(topicResult.error.message);
      } else {
        setTopicName(topicResult.data.name);
      }

      if (materialsResult.error) {
        setError(materialsResult.error.message);
      } else {
        setMaterials(materialsResult.data ?? []);
      }

      setLoading(false);
    }

    fetchData();
    return () => {
      mounted = false;
    };
  }, [topicId]);

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
          onPress={() => router.back()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>{'\u2190'} Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Study Mode</Text>
        {topicName && (
          <Text style={styles.subtitle}>{topicName}</Text>
        )}

        {materials.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptyTitle}>No study materials</Text>
            <Text style={styles.emptySubtitle}>
              There are no study materials available for this topic yet.
            </Text>
          </View>
        ) : (
          materials.map((material) => (
            <TouchableOpacity
              key={material.id}
              style={styles.materialCard}
              onPress={() =>
                router.push(
                  `/topic/${topicId}/study/view?materialId=${material.id}`,
                )
              }
            >
              <Text style={styles.materialTitle}>{material.title}</Text>
              {material.description ? (
                <Text style={styles.materialDescription}>
                  {material.description}
                </Text>
              ) : null}
              <Text style={styles.openLink}>Open to study {'\u2192'}</Text>
            </TouchableOpacity>
          ))
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
    marginBottom: spacing.xl,
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
  materialCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  materialTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  materialDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  openLink: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
});
