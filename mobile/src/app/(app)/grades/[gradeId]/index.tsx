import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../../../utils/supabase';
import { colors, spacing, typography } from '../../../../constants/theme';
import { useSession } from '../../../../utils/auth-context';
import { showPrompt } from '../../../../utils/prompt';

interface Subject {
  id: string;
  name: string;
  display_order: number;
}

export default function SubjectListScreen() {
  const { gradeId } = useLocalSearchParams<{ gradeId: string }>();
  const [gradeName, setGradeName] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useSession();
  const canManage = profile?.role === 'admin' || profile?.role === 'teacher';

  async function fetchData() {
    try {
      const [gradeResult, subjectsResult] = await Promise.all([
        supabase.from('grades').select('name').eq('id', gradeId).single(),
        supabase
          .from('subjects')
          .select('*')
          .eq('grade_id', gradeId)
          .order('display_order'),
      ]);

      if (gradeResult.error) throw gradeResult.error;
      if (subjectsResult.error) throw subjectsResult.error;

      setGradeName(gradeResult.data.name);
      setSubjects(subjectsResult.data ?? []);
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
    Alert.alert(
      'Delete Subject',
      `Are you sure you want to delete "${subject.name}"? This will also delete all topics within this subject.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error: deleteError } = await supabase
              .from('subjects')
              .delete()
              .eq('id', subject.id);
            if (deleteError) {
              console.error('Failed to delete subject:', deleteError);
              return;
            }
            await fetchData();
          },
        },
      ],
    );
  };

  const handleLongPress = (subject: Subject) => {
    if (!canManage) return;
    Alert.alert(subject.name, undefined, [
      { text: 'Rename', onPress: () => handleRenameSubject(subject) },
      { text: 'Delete', style: 'destructive', onPress: () => handleDeleteSubject(subject) },
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
            <Text style={styles.subjectName}>{subject.name}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
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
  subjectName: {
    ...typography.body,
    color: colors.textPrimary,
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
});
