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

export default function AdminApprovalsScreen() {
  const goBack = useSafeBack('/(app)');
  const { profile } = useSession();
  const [pending, setPending] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadPending();
  }, []);

  async function loadPending() {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: true });

    if (!error && data) {
      setPending(data as Profile[]);
    }
    setLoading(false);
  }

  async function handleAction(
    userId: string,
    newStatus: 'active' | 'rejected',
  ) {
    setProcessing(userId);
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      setErrorMsg(error.message);
    } else {
      setErrorMsg(null);
      setPending((prev) => prev.filter((p) => p.id !== userId));
    }
    setProcessing(null);
  }

  if (profile?.role !== 'admin') {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Access denied. Admins only.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={goBack}>
        <Text style={styles.backText}>{'\u2190'} Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Pending Approvals</Text>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : pending.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No pending approvals.</Text>
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
                <View
                  style={[
                    styles.roleBadge,
                    item.role === 'teacher'
                      ? styles.roleTeacher
                      : styles.roleStudent,
                  ]}
                >
                  <Text style={styles.roleBadgeText}>{item.role}</Text>
                </View>
              </View>
              <Text style={styles.email}>{item.id}</Text>
              {errorMsg && (
                <Text style={styles.errorMsg}>{errorMsg}</Text>
              )}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn]}
                  onPress={() => handleAction(item.id, 'active')}
                  disabled={processing === item.id}
                >
                  {processing === item.id ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.actionText}>Approve</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={() => handleAction(item.id, 'rejected')}
                  disabled={processing === item.id}
                >
                  <Text style={styles.actionText}>Reject</Text>
                </TouchableOpacity>
              </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  name: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  roleBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleTeacher: {
    backgroundColor: '#EFF6FF',
  },
  roleStudent: {
    backgroundColor: '#F0FDF4',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  email: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.md,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveBtn: {
    backgroundColor: colors.success,
  },
  rejectBtn: {
    backgroundColor: colors.error,
  },
  actionText: {
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
