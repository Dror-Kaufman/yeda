import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../utils/supabase';
import { colors, spacing, typography } from '../../../constants/theme';
import { useSession } from '../../../utils/auth-context';
import { showPrompt } from '../../../utils/prompt';

interface Grade {
  id: string;
  name: string;
  display_order: number;
}

export default function GradeListScreen() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useSession();
  const canManage = profile?.role === 'admin';

  async function fetchGrades() {
    const { data, error: fetchError } = await supabase
      .from('grades')
      .select('*')
      .order('display_order');

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setGrades(data ?? []);
    }
  }

  useEffect(() => {
    let mounted = true;

    fetchGrades().finally(() => {
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const handleAddGrade = () => {
    showPrompt('Add Grade', 'Enter grade name', async (text) => {
      if (!text?.trim()) return;
      const { error: insertError } = await supabase
        .from('grades')
        .insert({ name: text.trim(), display_order: grades.length + 1 });
      if (insertError) {
        console.error('Failed to add grade:', insertError);
        return;
      }
      await fetchGrades();
    });
  };

  const handleRenameGrade = (grade: Grade) => {
    showPrompt('Rename Grade', 'Enter new name', async (text) => {
      if (!text?.trim()) return;
      const { error: updateError } = await supabase
        .from('grades')
        .update({ name: text.trim() })
        .eq('id', grade.id);
      if (updateError) {
        console.error('Failed to rename grade:', updateError);
        return;
      }
      await fetchGrades();
    }, grade.name);
  };

  const handleDeleteGrade = (grade: Grade) => {
    Alert.alert(
      'Delete Grade',
      `Are you sure you want to delete "${grade.name}"? This will also delete all subjects and topics within this grade.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error: deleteError } = await supabase
              .from('grades')
              .delete()
              .eq('id', grade.id);
            if (deleteError) {
              console.error('Failed to delete grade:', deleteError);
              return;
            }
            await fetchGrades();
          },
        },
      ],
    );
  };

  const handleLongPress = (grade: Grade) => {
    if (!canManage) return;
    Alert.alert(grade.name, undefined, [
      { text: 'Rename', onPress: () => handleRenameGrade(grade) },
      { text: 'Delete', style: 'destructive', onPress: () => handleDeleteGrade(grade) },
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
      <Text style={styles.title}>Select Grade</Text>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {canManage && (
          <TouchableOpacity style={styles.addButton} onPress={handleAddGrade}>
            <Text style={styles.addButtonText}>+ Add Grade</Text>
          </TouchableOpacity>
        )}
        {grades.map((grade) => (
          <TouchableOpacity
            key={grade.id}
            style={styles.card}
            onPress={() => router.push(`/grades/${grade.id}`)}
            onLongPress={() => handleLongPress(grade)}
          >
            <Text style={styles.cardText}>{grade.name}</Text>
            <Text style={styles.cardArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 16,
  },
  cardText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  cardArrow: {
    fontSize: 24,
    color: colors.textTertiary,
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
