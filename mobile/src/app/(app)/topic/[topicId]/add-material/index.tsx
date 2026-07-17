import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../../../../utils/supabase';
import { useSession } from '../../../../../utils/auth-context';
import { colors, spacing, typography } from '../../../../../constants/theme';

// ── Helpers ──────────────────────────────────────────────────────────

function validateUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

// ── Component ──────────────────────────────────────────────────────

export default function AddMaterialScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const { session } = useSession();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [googleDocsUrl, setGoogleDocsUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Per-field validation (only shown after first submit attempt)
  const [touched, setTouched] = useState({
    title: false,
    googleDocsUrl: false,
  });

  const titleError = !title.trim() ? 'Title is required' : null;
  const urlError = !googleDocsUrl.trim()
    ? 'Google Docs URL is required'
    : !validateUrl(googleDocsUrl.trim())
      ? 'Enter a valid URL (https://...)'
      : null;

  const hasErrors = titleError !== null || urlError !== null;

  async function handleSubmit() {
    setTouched({ title: true, googleDocsUrl: true });

    if (hasErrors) return;

    if (!session?.user?.id) {
      setError('You must be signed in to add materials.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase
      .from('study_materials')
      .insert({
        topic_id: topicId,
        title: title.trim(),
        description: description.trim() || '',
        google_docs_url: googleDocsUrl.trim(),
        created_by: session.user.id,
      });

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.back();
  }

  // ── Render ────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>{'\u2190'} Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Add Material</Text>
        <Text style={styles.subtitle}>
          Add a Google Docs study material to this topic.
        </Text>

        {/* ── Title ──────────────────────────────────────────── */}
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={[
            styles.input,
            touched.title && titleError ? styles.inputError : null,
          ]}
          placeholder="e.g. Chapter 1 Summary"
          placeholderTextColor={colors.textTertiary}
          value={title}
          onChangeText={setTitle}
          onBlur={() => setTouched((prev) => ({ ...prev, title: true }))}
          editable={!submitting}
        />
        {touched.title && titleError ? (
          <Text style={styles.fieldError}>{titleError}</Text>
        ) : null}

        {/* ── Description ────────────────────────────────────── */}
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Optional description"
          placeholderTextColor={colors.textTertiary}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          editable={!submitting}
        />

        {/* ── Google Docs URL ────────────────────────────────── */}
        <Text style={styles.label}>Google Docs URL *</Text>
        <TextInput
          style={[
            styles.input,
            touched.googleDocsUrl && urlError ? styles.inputError : null,
          ]}
          placeholder="https://docs.google.com/document/d/..."
          placeholderTextColor={colors.textTertiary}
          value={googleDocsUrl}
          onChangeText={setGoogleDocsUrl}
          onBlur={() =>
            setTouched((prev) => ({ ...prev, googleDocsUrl: true }))
          }
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          editable={!submitting}
        />
        {touched.googleDocsUrl && urlError ? (
          <Text style={styles.fieldError}>{urlError}</Text>
        ) : null}

        {/* ── Error banner ───────────────────────────────────── */}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        {/* ── Submit ─────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.7}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Add Material</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.xxl,
  },
  backButton: {
    marginBottom: spacing.md,
  },
  backText: {
    ...typography.body,
    color: colors.primary,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  inputError: {
    borderColor: colors.error,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  fieldError: {
    ...typography.caption,
    color: colors.error,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorBannerText: {
    ...typography.body,
    color: colors.error,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
