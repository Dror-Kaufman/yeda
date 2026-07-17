import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../../../../utils/supabase';
import { colors, spacing, typography } from '../../../../../constants/theme';

// ── Component ──────────────────────────────────────────────────────

export default function StudyMaterialViewScreen() {
  const { topicId, materialId } = useLocalSearchParams<{
    topicId: string;
    materialId: string;
  }>();
  const [title, setTitle] = useState<string | null>(null);
  const [googleDocsUrl, setGoogleDocsUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchMaterial() {
      const { data, error: fetchError } = await supabase
        .from('study_materials')
        .select('title, google_docs_url')
        .eq('id', materialId)
        .single();

      if (!mounted) return;

      if (fetchError) {
        setError(fetchError.message);
      } else if (data) {
        setTitle(data.title);
        setGoogleDocsUrl(data.google_docs_url);
      }
      setLoading(false);
    }

    fetchMaterial();
    return () => {
      mounted = false;
    };
  }, [materialId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !googleDocsUrl) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {error ?? 'Material not found.'}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>{'\u2190'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title ?? 'Study Material'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Google Docs iframe */}
      <View style={styles.iframeContainer}>
        <iframe
          src={googleDocsUrl}
          style={styles.iframe}
          title={title ?? 'Study Material'}
          allowFullScreen
        />
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  retryButtonText: {
    color: colors.primary,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  backText: {
    ...typography.body,
    color: colors.primary,
  },
  headerTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.md,
  },
  headerSpacer: {
    width: 60, // Balance the back button width
  },
  iframeContainer: {
    flex: 1,
  },
  iframe: {
    width: '100%',
    height: '100%',
    borderWidth: 0,
  },
});
