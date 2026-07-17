import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../../../utils/supabase';
import { colors, spacing, typography } from '../../../../constants/theme';
import { useSession } from '../../../../utils/auth-context';
import { showPrompt } from '../../../../utils/prompt';

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

  const [subjectName, setSubjectName] = useState('');
  const [gradeName, setGradeName] = useState('');
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    Alert.alert(
      'Delete Topic',
      `Are you sure you want to delete "${topic.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error: deleteError } = await supabase
              .from('topics')
              .delete()
              .eq('id', topic.id);
            if (deleteError) {
              console.error('Failed to delete topic:', deleteError);
              return;
            }
            await fetchData();
          },
        },
      ],
    );
  };

  const handleLongPress = (topic: TopicRow) => {
    if (!canManage) return;
    Alert.alert(topic.name, undefined, [
      { text: 'Rename', onPress: () => handleRenameTopic(topic) },
      { text: 'Delete', style: 'destructive', onPress: () => handleDeleteTopic(topic) },
      { text: 'Cancel', style: 'cancel' },
    ]);
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
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
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
});
