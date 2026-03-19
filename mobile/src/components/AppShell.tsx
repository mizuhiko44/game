import { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Tab, appTabs } from "../lib/navigation";
import { isWideLayout, resolvePlatformLabel } from "../lib/platform";

type AppShellProps = PropsWithChildren<{
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  nickname?: string;
  userId?: string;
  onLogout?: () => void | Promise<void>;
}>;

export function AppShell({ tab, onTabChange, nickname, userId, onLogout, children }: AppShellProps) {
  const { width } = useWindowDimensions();
  const wide = isWideLayout(width);

  if (wide) {
    return (
      <View style={styles.desktopRoot}>
        <View style={styles.sidebar}>
          <Text style={styles.brandTitle}>Prediction Game</Text>
          <Text style={styles.platformBadge}>{resolvePlatformLabel()} foundation</Text>
          <View style={styles.profileCard}>
            <Text style={styles.profileText}>nickname: {nickname ?? "(未登録)"}</Text>
            <Text style={styles.profileText}>x-user-id: {userId ?? "(未登録)"}</Text>
            {!!userId && (
              <Pressable onPress={onLogout} style={styles.logoutButton}>
                <Text style={styles.logoutButtonText}>ログアウト</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.navGroup}>
            {appTabs.map((entry) => {
              const active = entry.key === tab;
              return (
                <Pressable
                  key={entry.key}
                  onPress={() => onTabChange(entry.key)}
                  style={[styles.sidebarTab, active && styles.sidebarTabActive]}
                >
                  <Text style={[styles.sidebarTabText, active && styles.sidebarTabTextActive]}>{entry.label}</Text>
                  <Text style={styles.sidebarSectionText}>{entry.section}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.desktopContent}>{children}</View>
      </View>
    );
  }

  return (
    <View style={styles.mobileRoot}>
      <View style={styles.userBar}>
        <Text style={styles.userText}>nickname: {nickname ?? "(未登録)"} / x-user-id: {userId ?? "(未登録)"}</Text>
        {!!userId && (
          <Pressable onPress={onLogout}>
            <Text style={styles.logoutText}>ログアウト</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.mobileContent}>{children}</View>
      <View style={styles.tabBar}>
        {appTabs.map((entry) => (
          <Pressable key={entry.key} onPress={() => onTabChange(entry.key)}>
            <Text style={[styles.tabLabel, tab === entry.key && styles.active]}>{entry.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  desktopRoot: { flex: 1, flexDirection: "row", backgroundColor: "#0B1020" },
  sidebar: { width: 280, backgroundColor: "#121A30", paddingHorizontal: 16, paddingTop: 28, paddingBottom: 20, gap: 16 },
  brandTitle: { color: "#F4F7FF", fontSize: 24, fontWeight: "700" },
  platformBadge: { color: "#5BA7FF", fontSize: 12, fontWeight: "700" },
  profileCard: { backgroundColor: "#141D34", borderRadius: 12, padding: 12, gap: 6 },
  profileText: { color: "#AAB4D4", fontSize: 12 },
  logoutButton: { marginTop: 6, backgroundColor: "#5BA7FF", borderRadius: 999, paddingVertical: 10, alignItems: "center" },
  logoutButtonText: { color: "#0B1020", fontWeight: "700" },
  navGroup: { gap: 8, flex: 1 },
  sidebarTab: { borderRadius: 12, borderWidth: 1, borderColor: "#2B3554", padding: 12, gap: 4 },
  sidebarTabActive: { borderColor: "#5BA7FF", backgroundColor: "#192443" },
  sidebarTabText: { color: "#F4F7FF", fontWeight: "700" },
  sidebarTabTextActive: { color: "#5BA7FF" },
  sidebarSectionText: { color: "#7F8DB6", fontSize: 11, textTransform: "uppercase" },
  desktopContent: { flex: 1 },
  mobileRoot: { flex: 1, backgroundColor: "#0E1428" },
  mobileContent: { flex: 1 },
  userBar: {
    minHeight: 28,
    backgroundColor: "#0E1428",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    flexDirection: "row",
    gap: 8,
  },
  userText: { color: "#7F8DB6", fontSize: 11, flex: 1 },
  logoutText: { color: "#5BA7FF", fontSize: 11, fontWeight: "700" },
  tabBar: {
    minHeight: 56,
    backgroundColor: "#151D33",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    flexWrap: "wrap",
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  tabLabel: { color: "#AAB4D4", fontSize: 10, marginHorizontal: 2 },
  active: { color: "#5BA7FF", fontWeight: "700" },
});
