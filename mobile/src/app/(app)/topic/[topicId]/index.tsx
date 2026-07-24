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
import { useSafeBack } from '../../../../utils/useSafeBack';
import { supabase } from '../../../../utils/supabase';
import { useSession } from '../../../../utils/auth-context';
import { colors, spacing, typography } from '../../../../constants/theme';

// ── Types ──────────────────────────────────────────────────────────

interface SubjectGrade {
  name: string;
}

interface SubjectInfo {
  name: string;
  grade: SubjectGrade | null;
}

interface TopicData {
  id: string;
  name: string;
  subject: SubjectInfo | null;
}

interface StudyMaterial {
  id: string;
  topic_id: string;
  title: string;
  description: string | null;
  google_docs_url: string | null;
  created_by: string;
  created_at: string;
}

// ── Component ──────────────────────────────────────────────────────

export default function TopicDetailScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const goBack = useSafeBack('/(app)');
  const { profile } = useSession();

  const [topic, setTopic] = useState<TopicData | null>(null);
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isTeacherOrAdmin =
    profile?.role === 'teacher' || profile?.role === 'admin';
  const isStudent = profile?.role === 'student';

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      const [topicResult, materialsResult, countResult] = await Promise.all([
        supabase
          .from('topics')
          .select('*, subject:subjects(name, grade:grades(name))')
          .eq('id', topicId)
          .single(),
        supabase
          .from('study_materials')
          .select('*')
          .eq('topic_id', topicId),
        supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('topic_id', topicId)
          .eq('status', 'published'),
      ]);

      if (!mounted) return;

      if (topicResult.error) {
        setError(topicResult.error.message);
      } else {
        setTopic(topicResult.data as TopicData);
      }

      if (!materialsResult.error) {
        setStudyMaterials(materialsResult.data ?? []);
      }

      if (!countResult.error) {
        setQuestionCount(countResult.count ?? 0);
      }

      setLoading(false);
    }

    fetchData();

    return () => {
      mounted = false;
    };
  }, [topicId]);

  // ── Loading / Error states ───────────────────────────────────────

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
      </View>
    );
  }

  // ── Render ───────────────────────────────────────────────────────

  const breadcrumb =
    topic?.subject
      ? `${topic.subject.name} > ${topic.subject.grade?.name ?? ''}`
      : '';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Back Button */}
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Text style={styles.backText}>{'\u2190'} Back</Text>
        </TouchableOpacity>

        {/* Topic Header */}
        <Text style={styles.topicTitle}>{topic?.name}</Text>
        {breadcrumb ? (
          <Text style={styles.breadcrumb}>{breadcrumb}</Text>
        ) : null}

        {/* SECTION 1 — Study Materials */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Study Materials</Text>

          {studyMaterials.length > 0 ? (
            studyMaterials.map((material) => (
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
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>
              {isTeacherOrAdmin
                ? 'No study materials yet'
                : 'No materials available'}
            </Text>
          )}

          {isTeacherOrAdmin && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push(`/topic/${topicId}/add-material`)}
            >
              <Text style={styles.primaryButtonText}>Add Material</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* SECTION 2 — Modes (students only) */}
        {isStudent && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Modes</Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push(`/topic/${topicId}/exercise`)}
            >
              <Text style={styles.primaryButtonText}>Exercise Mode</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.outlinedButton, styles.modeButtonSpacing]}
              onPress={() => router.push(`/topic/${topicId}/exam`)}
            >
              <Text style={styles.outlinedButtonText}>Exam Mode</Text>
            </TouchableOpacity>

            <Text style={styles.questionCount}>
              {questionCount} questions available
            </Text>
          </View>
        )}

        {/* SECTION 3 — Teacher Management (teachers / admins) */}
        {isTeacherOrAdmin && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push(`/topic/${topicId}/manage-questions`)}
            >
              <Text style={styles.primaryButtonText}>Manage Questions</Text>
            </TouchableOpacity>
          </View>
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
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.xxl,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
  },
  backButton: {
    marginBottom: spacing.md,
  },
  backText: {
    ...typography.body,
    color: colors.primary,
  },
  topicTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  breadcrumb: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  materialCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.sm,
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
  },
  emptyText: {
    ...typography.body,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  outlinedButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  outlinedButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  modeButtonSpacing: {
    marginTop: spacing.md,
  },
  questionCount: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
