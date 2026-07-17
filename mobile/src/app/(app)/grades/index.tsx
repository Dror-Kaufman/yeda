import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../utils/supabase';
import { colors, spacing, typography } from '../../../constants/theme';
import { useSession } from '../../../utils/auth-context';
import { showPrompt } from '../../../utils/prompt';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';

interface Grade {
  id: string;
  name: string;
  display_order: number;
}

export default function GradeListScreen() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Grade | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [menuTarget, setMenuTarget] = useState<Grade | null>(null);
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
    setDeleteConfirm(grade);
  };

  const confirmDeleteGrade = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    const { error: deleteError } = await supabase
      .from('grades')
      .delete()
      .eq('id', deleteConfirm.id);
    if (deleteError) {
      console.error('Failed to delete grade:', deleteError);
      setDeleteLoading(false);
      setDeleteConfirm(null);
      return;
    }
    await fetchGrades();
    setDeleteLoading(false);
    setDeleteConfirm(null);
  };

  const handleLongPress = (grade: Grade) => {
    if (!canManage) return;
    setMenuTarget(grade);
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

      <ConfirmDialog
        visible={deleteConfirm !== null}
        title="Delete Grade"
        message={
          deleteConfirm
            ? `Are you sure you want to delete "${deleteConfirm.name}"? This will also delete all subjects and topics within this grade.`
            : ''
        }
        onCancel={() => {
          setDeleteConfirm(null);
          setDeleteLoading(false);
        }}
        onConfirm={confirmDeleteGrade}
        loading={deleteLoading}
      />

      {menuTarget && (
        <View style={styles.actionOverlay}>
          <Pressable style={styles.actionBackdrop} onPress={() => setMenuTarget(null)} />
          <View style={styles.actionCard}>
            <TouchableOpacity
              style={styles.actionOption}
              onPress={() => {
                handleRenameGrade(menuTarget);
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
