import { StyleSheet, Text, View } from "react-native";
import { ScreenTemplate } from "../components/ScreenTemplate";

export function AdminAccessScreen({ userId, role }: { userId?: string; role?: string }) {
  return (
    <ScreenTemplate title="Admin access guide">
      <View style={styles.card}>
        <Text style={styles.heading}>この画面は admin 専用です。</Text>
        <Text style={styles.body}>現在の role: {role ?? "guest"}</Text>
        <Text style={styles.body}>現在の x-user-id: {userId ?? "(未ログイン)"}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>テスト方法</Text>
        <Text style={styles.body}>1. backend で seed を実行します。</Text>
        <Text style={styles.body}>2. mobile で `DemoUser` としてログインします。</Text>
        <Text style={styles.body}>3. `usr_demo_1` / `role=admin` が表示されれば Admin API を試せます。</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>確認ポイント</Text>
        <Text style={styles.body}>- 上部バーの role が `admin` になっていること</Text>
        <Text style={styles.body}>- seed データの demo user は `DemoUser` / `usr_demo_1` です</Text>
        <Text style={styles.body}>- backend 直叩きなら `/api/admin/events`, `/api/admin/events/settle`, `/api/admin/users` を確認できます</Text>
      </View>
    </ScreenTemplate>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#141D34",
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#2B3554",
  },
  heading: {
    color: "#F4F7FF",
    fontSize: 18,
    fontWeight: "700",
  },
  body: {
    color: "#AAB4D4",
    fontSize: 14,
    lineHeight: 20,
  },
});
