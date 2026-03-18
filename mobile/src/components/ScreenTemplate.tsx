import { PropsWithChildren } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text } from "react-native";
import { colors } from "../theme/colors";

export function ScreenTemplate({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{title}</Text>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 16, gap: 12 },
  title: { color: colors.text, fontSize: 24, fontWeight: "700" },
});
