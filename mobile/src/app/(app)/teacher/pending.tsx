import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Platform,
} from 'react-native';
import { useSafeBack } from '../../../utils/useSafeBack';
import { supabase } from '../../../utils/supabase';
import { useSession } from '../../../utils/auth-context';
import type { Profile } from '../../../utils/auth-context';
import { colors, spacing, typography } from '../../../constants/theme';

export default function TeacherPendingScreen() {
  const goBack = useSafeBack('/(app)');
  const { profile } = useSession();
  const [pending, setPending] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadPendingStudents();
  }, []);

  async function loadPendingStudents() {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('status', 'pending_approval')
      .eq('role', 'student')
      .order('created_at', { ascending: true });

    if (!error && data) {
      setPending(data as Profile[]);
    }
    setLoading(false);
  }

  async function handleApprove(userId: string) {
    setProcessing(userId);
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      setErrorMsg(error.message);
    } else {
      setErrorMsg(null);
      setPending((prev) => prev.filter((p) => p.id !== userId));
    }
    setProcessing(null);
  }

  if (profile?.role !== 'teacher') {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Access denied. Teachers only.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={goBack}>
        <Text style={styles.backText}>{'\u2190'} Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Pending Students</Text>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : pending.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No pending students.</Text>
        </View>
      ) : (
        <FlatList
          data={pending}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.name}>{item.display_name}</Text>
              </View>
              <Text style={styles.email}>{item.id}</Text>
              {errorMsg && (
                <Text style={styles.errorMsg}>{errorMsg}</Text>
              )}
              <TouchableOpacity
                style={[styles.approveBtn, processing === item.id && styles.btnDisabled]}
                onPress={() => handleApprove(item.id)}
                disabled={processing === item.id}
              >
                {processing === item.id ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.approveText}>Approve</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 60,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  backText: {
    ...typography.body,
    color: colors.primary,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    marginBottom: spacing.xs,
  },
  name: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  email: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.md,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  approveBtn: {
    backgroundColor: colors.success,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  approveText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyText: {
    ...typography.body,
    color: colors.textTertiary,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
  },
  errorMsg: {
    ...typography.caption,
    color: colors.error,
    marginBottom: spacing.sm,
  },
});
