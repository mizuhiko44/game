import { StyleSheet, Text, View } from "react-native";

export default function WebPlaceholderPage() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Prediction Game Web Test</Text>
      <Text style={styles.description}>
        Web deployment is intentionally pinned to this placeholder page until the real web flow is ready.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#0E1428",
  },
  title: {
    color: "#F4F7FF",
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 16,
  },
  description: {
    maxWidth: 480,
    color: "#C6D2F6",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
});
