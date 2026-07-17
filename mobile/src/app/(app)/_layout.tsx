import { Redirect, Stack } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useSession } from '../../utils/auth-context';
import { colors } from '../../constants/theme';

export default function AppLayout() {
  const { isAuthorized, isLoading } = useSession();

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthorized) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="admin/approvals" />
      <Stack.Screen name="teacher/pending" />
      <Stack.Screen name="grades" />
      <Stack.Screen name="topics/[subjectId]" />
      <Stack.Screen name="topic/[topicId]" />
      <Stack.Screen name="topic/[topicId]/exercise" />
      <Stack.Screen name="topic/[topicId]/exercise/session" />
      <Stack.Screen name="topic/[topicId]/study" />
      <Stack.Screen name="topic/[topicId]/study/view" />
      <Stack.Screen name="topic/[topicId]/exam" />
      <Stack.Screen name="topic/[topicId]/exam/session" />
      <Stack.Screen name="topic/[topicId]/manage-questions" />
      <Stack.Screen name="topic/[topicId]/manage-questions/paste" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
