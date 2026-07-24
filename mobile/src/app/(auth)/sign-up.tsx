import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Link } from 'expo-router';
import { useSafeBack } from '../../utils/useSafeBack';
import { useSession } from '../../utils/auth-context';
import { colors, spacing, typography } from '../../constants/theme';

type SelectedRole = 'teacher' | 'student';

export default function SignUpScreen() {
  const goBack = useSafeBack('/(auth)/sign-in');
  const { session, profile, signUp } = useSession();

  // If already signed in but profile is pending (e.g. after refresh), show message
  const alreadyPending = !!session && profile && profile.status !== 'active';

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<SelectedRole>('student');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(
    alreadyPending
      ? `Your account is pending approval. You'll be able to sign in once approved.`
      : null,
  );
  const [loading, setLoading] = useState(false);

  // Disable form if already signed up and pending
  const formDisabled = loading || (!!success && !error);

  async function handleSignUp() {
    if (!displayName.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    const result = await signUp(email.trim(), password, role, displayName.trim());
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(
        `Account created! Your registration as a ${role} is pending approval. You will be able to sign in once approved.`,
      );
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backText}>{'\u2190'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join Yeda as a teacher or student</Text>

        {error && <Text style={styles.error}>{error}</Text>}
        {success && <Text style={styles.success}>{success}</Text>}

        <TextInput
          style={styles.input}
          placeholder="Full Name"
          placeholderTextColor={colors.textTertiary}
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          editable={!formDisabled}
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textTertiary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          editable={!formDisabled}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textTertiary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          editable={!formDisabled}
        />

        <Text style={styles.label}>I am a...</Text>
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleButton, role === 'student' && styles.roleSelected]}
            onPress={() => setRole('student')}
            disabled={formDisabled}
          >
            <Text
              style={[styles.roleText, role === 'student' && styles.roleTextSelected]}
            >
              Student
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, role === 'teacher' && styles.roleSelected]}
            onPress={() => setRole('teacher')}
            disabled={formDisabled}
          >
            <Text
              style={[styles.roleText, role === 'teacher' && styles.roleTextSelected]}
            >
              Teacher
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, formDisabled && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={formDisabled}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/sign-in" style={styles.link}>
            Sign in
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    marginBottom: spacing.md,
  },
  backText: {
    ...typography.body,
    color: colors.primary,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  error: {
    color: colors.error,
    ...typography.caption,
    marginBottom: spacing.md,
    backgroundColor: '#FEF2F2',
    padding: spacing.sm,
    borderRadius: 8,
  },
  success: {
    color: colors.success,
    ...typography.caption,
    marginBottom: spacing.md,
    backgroundColor: '#F0FDF4',
    padding: spacing.sm,
    borderRadius: 8,
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginBottom: spacing.md,
  },
  label: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  roleSelected: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  roleText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  roleTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  link: {
    color: colors.primary,
    fontSize: 14,
  },
});
