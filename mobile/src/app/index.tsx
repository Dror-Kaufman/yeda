import { Redirect } from 'expo-router';

// The root layout handles auth gating via Stack.Protected.
// This file exists only to satisfy Expo Router's requirement for an index route.
// The runtime always shows (auth) or (app) groups.
export default function Index() {
  return <Redirect href="/(auth)/sign-in" />;
}
