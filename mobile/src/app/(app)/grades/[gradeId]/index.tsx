import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeBack } from '../../../../utils/useSafeBack';
import { supabase } from '../../../../utils/supabase';
import { colors, spacing, typography } from '../../../../constants/theme';
import { useSession } from '../../../../utils/auth-context';
import { showPrompt } from '../../../../utils/prompt';
import ConfirmDialog from '../../../../components/ui/ConfirmDialog';

interface Subject {
  id: string;
  name: string;
  display_order: number;
}

interface SubjectWithTopics extends Subject {
  topics: { count: number }[];
}

export default function SubjectListScreen() {
  const { gradeId } = useLocalSearchParams<{ gradeId: string }>();
  const goBack = useSafeBack('/(app)');
  const [gradeName, setGradeName] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topicCounts, setTopicCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Subject | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [menuTarget, setMenuTarget] = useState<Subject | null>(null);
  const { profile } = useSession();
  const canManage = profile?.role === 'admin' || profile?.role === 'teacher';

  async function fetchData() {
    try {
      const [gradeResult, subjectsResult] = await Promise.all([
        supabase.from('grades').select('name').eq('id', gradeId).single(),
        supabase
          .from('subjects')
          .select('*, topics(count)')
          .eq('grade_id', gradeId)
          .order('display_order'),
      ]);

      if (gradeResult.error) throw gradeResult.error;
      if (subjectsResult.error) throw subjectsResult.error;

      setGradeName(gradeResult.data.name);
      const subjectsData = (subjectsResult.data ?? []) as SubjectWithTopics[];
      setSubjects(subjectsData);
      const counts: Record<string, number> = {};
      for (const subject of subjectsData) {
        counts[subject.id] = subject.topics[0]?.count ?? 0;
      }
      setTopicCounts(counts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (gradeId) fetchData();
  }, [gradeId]);

  const handleAddSubject = () => {
    showPrompt('Add Subject', 'Enter subject name', async (text) => {
      if (!text?.trim()) return;
      const { error: insertError } = await supabase
        .from('subjects')
        .insert({ name: text.trim(), grade_id: gradeId, display_order: subjects.length + 1 });
      if (insertError) {
        console.error('Failed to add subject:', insertError);
        return;
      }
      await fetchData();
    });
  };

  const handleRenameSubject = (subject: Subject) => {
    showPrompt('Rename Subject', 'Enter new name', async (text) => {
      if (!text?.trim()) return;
      const { error: updateError } = await supabase
        .from('subjects')
        .update({ name: text.trim() })
        .eq('id', subject.id);
      if (updateError) {
        console.error('Failed to rename subject:', updateError);
        return;
      }
      await fetchData();
    }, subject.name);
  };

  const handleDeleteSubject = (subject: Subject) => {
    setDeleteConfirm(subject);
  };

  const confirmDeleteSubject = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    const { error: deleteError } = await supabase
      .from('subjects')
      .delete()
      .eq('id', deleteConfirm.id);
    if (deleteError) {
      console.error('Failed to delete subject:', deleteError);
      setDeleteLoading(false);
      setDeleteConfirm(null);
      return;
    }
    await fetchData();
    setDeleteLoading(false);
    setDeleteConfirm(null);
  };

  const handleLongPress = (subject: Subject) => {
    if (!canManage) return;
    setMenuTarget(subject);
  };

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

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={goBack}>
        <Text style={styles.backText}>{'\u2190'} Back</Text>
      </TouchableOpacity>
      <Text style={styles.gradeName}>{gradeName}</Text>
      {canManage && (
        <TouchableOpacity style={styles.addButton} onPress={handleAddSubject}>
          <Text style={styles.addButtonText}>+ Add Subject</Text>
        </TouchableOpacity>
      )}
      <View style={styles.card}>
        {subjects.map((subject) => (
          <TouchableOpacity
            key={subject.id}
            style={styles.subjectItem}
            onPress={() => router.push(`/topics/${subject.id}`)}
            onLongPress={() => handleLongPress(subject)}
          >
            <View style={styles.subjectContent}>
              <Text style={styles.subjectName}>{subject.name}</Text>
              <Text style={styles.subjectMeta}>
                Topics: {topicCounts[subject.id] ?? 0}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ConfirmDialog
        visible={deleteConfirm !== null}
        title="Delete Subject"
        message={
          deleteConfirm
            ? `Are you sure you want to delete "${deleteConfirm.name}"? This will also delete all topics within this subject.`
            : ''
        }
        onCancel={() => {
          setDeleteConfirm(null);
          setDeleteLoading(false);
        }}
        onConfirm={confirmDeleteSubject}
        loading={deleteLoading}
      />

      {menuTarget && (
        <View style={styles.actionOverlay}>
          <Pressable style={styles.actionBackdrop} onPress={() => setMenuTarget(null)} />
          <View style={styles.actionCard}>
            <TouchableOpacity
              style={styles.actionOption}
              onPress={() => {
                handleRenameSubject(menuTarget);
                setMenuTarget(null);
              }}
            >
              <Text style={styles.actionOptionText}>Rename</Text>
            </TouchableOpacity>
            <View style={styles.actionDivider} />
            <TouchableOpacity
              style={styles.actionOption}
              onPress={() => {
                setDeleteConfirm(menuTarget);
                setMenuTarget(null);
              }}
            >
              <Text style={[styles.actionOptionText, { color: colors.error }]}>Delete</Text>
            </TouchableOpacity>
            <View style={styles.actionDivider} />
            <TouchableOpacity style={styles.actionOption} onPress={() => setMenuTarget(null)}>
              <Text style={[styles.actionOptionText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  gradeName: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  subjectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 16,
  },
  subjectContent: {
    flex: 1,
  },
  subjectName: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subjectMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  chevron: {
    fontSize: 24,
    color: colors.textTertiary,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  addButtonText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  actionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  backButton: {
    marginBottom: spacing.md,
  },
  backText: {
    ...typography.body,
    color: colors.primary,
  },
  actionBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  actionCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    width: '80%',
    maxWidth: 320,
    overflow: 'hidden',
  },
  actionOption: {
    paddingVertical: 16,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  actionOptionText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  actionDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
  },
});
