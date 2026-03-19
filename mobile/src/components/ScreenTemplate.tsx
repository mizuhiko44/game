import { PropsWithChildren } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { colors } from "../theme/colors";

export function ScreenTemplate({ title, children }: PropsWithChildren<{ title: string }>) {
  const { width } = useWindowDimensions();
  const desktop = width >= 960;

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.container, desktop && styles.containerDesktop]}>
          <Text style={styles.title}>{title}</Text>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: 16 },
  container: { gap: 12, width: "100%" },
  containerDesktop: { maxWidth: 960, alignSelf: "center" },
  title: { color: colors.text, fontSize: 24, fontWeight: "700" },
});
