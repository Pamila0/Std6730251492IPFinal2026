import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // 👈 ลบแถบดำ Expo Starter ด้านบนออกตรงนี้
      }}
    />
  );
}