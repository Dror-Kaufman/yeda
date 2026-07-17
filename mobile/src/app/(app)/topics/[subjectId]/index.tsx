import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeBack } from '../../../../utils/useSafeBack';
import { supabase } from '../../../../utils/supabase';
import { colors, spacing, typography } from '../../../../constants/theme';
import { useSession } from '../../../../utils/auth-context';
import { showPrompt } from '../../../../utils/prompt';
import ConfirmDialog from '../../../../components/ui/ConfirmDialog';

interface TopicRow {
  id: string;
  name: string;
  created_at: string;
  study_materials: { count: number }[];
  questions: { count: number }[];
}

export default function TopicListScreen() {
  const { subjectId } = useLocalSearchParams<{ subjectId: string }>();
  const { profile, session } = useSession();
  const canManage = profile?.role === 'admin' || profile?.role === 'teacher';
  const goBack = useSafeBack('/(app)');

  const [subjectName, setSubjectName] = useState('');
  const [gradeName, setGradeName] = useState('');
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<TopicRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [menuTarget, setMenuTarget] = useState<TopicRow | null>(null);

  async function fetchData() {
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('name, grade_id')
      .eq('id', subjectId)
      .single();

    if (subjectError) {
      setError(subjectError.message);
      setLoading(false);
      return;
    }

    setSubjectName(subject.name);

    const { data: grade } = await supabase
      .from('grades')
      .select('name')
      .eq('id', subject.grade_id)
      .single();

    if (grade) {
      setGradeName(grade.name);
    }

    const { data: topicsData, error: topicsError } = await supabase
      .from('topics')
      .select('*, study_materials(count), questions(count)')
      .eq('subject_id', subjectId)
      .order('name');

    if (topicsError) {
      setError(topicsError.message);
    } else {
      setTopics((topicsData ?? []) as TopicRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [subjectId]);

  const handleAddTopic = () => {
    showPrompt('Add Topic', 'Enter topic name', async (text) => {
      if (!text?.trim()) return;
      const { error: insertError } = await supabase
        .from('topics')
        .insert({
          name: text.trim(),
          subject_id: subjectId,
          created_by: session?.user?.id,
        });
      if (insertError) {
        console.error('Failed to add topic:', insertError);
        return;
      }
      await fetchData();
    });
  };

  const handleRenameTopic = (topic: TopicRow) => {
    showPrompt('Rename Topic', 'Enter new name', async (text) => {
      if (!text?.trim()) return;
      const { error: updateError } = await supabase
        .from('topics')
        .update({ name: text.trim() })
        .eq('id', topic.id);
      if (updateError) {
        console.error('Failed to rename topic:', updateError);
        return;
      }
      await fetchData();
    }, topic.name);
  };

  const handleDeleteTopic = (topic: TopicRow) => {
    setDeleteConfirm(topic);
  };

  const confirmDeleteTopic = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    const { error: deleteError } = await supabase
      .from('topics')
      .delete()
      .eq('id', deleteConfirm.id);
    if (deleteError) {
      console.error('Failed to delete topic:', deleteError);
      setDeleteLoading(false);
      setDeleteConfirm(null);
      return;
    }
    await fetchData();
    setDeleteLoading(false);
    setDeleteConfirm(null);
  };

  const handleLongPress = (topic: TopicRow) => {
    if (!canManage) return;
    setMenuTarget(topic);
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
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{subjectName}</Text>
      {gradeName ? (
        <Text style={styles.subtitle}>in {gradeName}</Text>
      ) : null}

      {canManage && (
        <TouchableOpacity style={styles.addButton} onPress={handleAddTopic}>
          <Text style={styles.addButtonText}>+ Add Topic</Text>
        </TouchableOpacity>
      )}

      {topics.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No topics yet</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {topics.map((topic) => (
            <TouchableOpacity
              key={topic.id}
              style={styles.card}
              onPress={() => router.push(`/topic/${topic.id}`)}
              onLongPress={() => handleLongPress(topic)}
            >
              <Text style={styles.topicName}>{topic.name}</Text>
              <Text style={styles.metaText}>
                Materials: {topic.study_materials[0]?.count ?? 0}  Questions:{' '}
                {topic.questions[0]?.count ?? 0}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ConfirmDialog
        visible={deleteConfirm !== null}
        title="Delete Topic"
        message={
          deleteConfirm ? `Are you sure you want to delete "${deleteConfirm.name}"?` : ''
        }
        onCancel={() => {
          setDeleteConfirm(null);
          setDeleteLoading(false);
        }}
        onConfirm={confirmDeleteTopic}
        loading={deleteLoading}
      />

      {menuTarget && (
        <View style={styles.actionOverlay}>
          <Pressable style={styles.actionBackdrop} onPress={() => setMenuTarget(null)} />
          <View style={styles.actionCard}>
            <TouchableOpacity
              style={styles.actionOption}
              onPress={() => {
                handleRenameTopic(menuTarget);
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
    fontWeight: '600',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  topicName: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  metaText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
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
