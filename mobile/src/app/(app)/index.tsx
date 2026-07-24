import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '../../utils/auth-context';
import { colors, spacing, typography } from '../../constants/theme';

export default function HomeScreen() {
  const { profile, signOut } = useSession();

  async function handleSignOut() {
    await signOut();
    router.replace('/(auth)/sign-in');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {profile?.display_name}</Text>
      <Text style={styles.subtitle}>
        You are signed in as {profile?.role}
      </Text>

      <View style={styles.card}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/(app)/grades')}
        >
          <Text style={styles.menuText}>Browse Content</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.separator} />

        {profile?.role === 'admin' && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(app)/admin/approvals')}
          >
            <Text style={styles.menuText}>Pending Approvals</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        )}

        {profile?.role === 'teacher' && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(app)/teacher/pending')}
          >
            <Text style={styles.menuText}>Pending Students</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        )}

      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
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
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 16,
  },
  menuText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  menuArrow: {
    fontSize: 24,
    color: colors.textTertiary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.cardBorder,
  },
  signOutButton: {
    marginTop: spacing.xl,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error,
  },
  signOutText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
});
