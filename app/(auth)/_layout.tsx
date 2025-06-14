import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Correction: Retiré initialRouteName du Stack.Screen individuel */}
      <Stack.Screen name="welcome" /> 
      <Stack.Screen name="create-account" />
      <Stack.Screen name="login" />
      <Stack.Screen name="verify-otp" />
      <Stack.Screen name="complete-profile" />
      <Stack.Screen name="master-login" />
    </Stack>
  );
}