import { PropsWithChildren, useMemo } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Tab, appTabs } from "../lib/navigation";
import { isWideLayout, resolvePlatformLabel } from "../lib/platform";
import { useAppState } from "../state/AppState";
import { colors } from "../theme/colors";

type AppShellProps = PropsWithChildren<{
  onLogout?: () => void | Promise<void>;
}>;

const HIDDEN_WIDE_TABS = new Set<Tab>(["Onboarding", "Vote", "EventDetail", "VoteComplete", "ResultDetail"]);

export function AppShell({ onLogout, children }: AppShellProps) {
  const { width } = useWindowDimensions();
  const wide = isWideLayout(width);
  const { tab, setTab, user, appEnv, authMode } = useAppState();

  const visibleTabs = useMemo(() => {
    if (!user) return appTabs.filter((entry) => entry.key === "Onboarding");
    if (!wide) return appTabs;
    return appTabs.filter((entry) => !HIDDEN_WIDE_TABS.has(entry.key));
  }, [user, wide]);

  if (wide) {
    return (
      <View style={styles.desktopRoot}>
        <View style={styles.sidebar}>
          <View style={styles.brandBlock}>
            <Text style={styles.brandEyebrow}>Web prototype / {resolvePlatformLabel()}</Text>
            <Text style={styles.brandTitle}>Prediction Game</Text>
            <Text style={styles.metaText}>イベント参加と運用確認をまとめて扱うダッシュボードUI</Text>
          </View>

          <View style={styles.metaPanel}>
            <View style={styles.metaChip}>
              <Text style={styles.metaChipLabel}>env</Text>
              <Text style={styles.metaChipValue}>{appEnv}</Text>
            </View>
            <View style={styles.metaChip}>
              <Text style={styles.metaChipLabel}>auth</Text>
              <Text style={styles.metaChipValue}>{authMode}</Text>
            </View>
          </View>

          {!!user?.id && (
            <Pressable onPress={() => setTab("Vote")} style={styles.voteSpotlight}>
              <Text style={styles.voteSpotlightEyebrow}>Quick action</Text>
              <Text style={styles.voteSpotlightTitle}>Vote</Text>
              <Text style={styles.voteSpotlightText}>空いたスペースを使って、左帯からすぐ投票へ入れる目立つ導線にしました。</Text>
            </Pressable>
          )}

          <View style={styles.navGroup}>
            {visibleTabs.map((entry) => {
              const active = entry.key === tab;
              return (
                <Pressable key={entry.key} onPress={() => setTab(entry.key)} style={[styles.sidebarTab, active && styles.sidebarTabActive]}>
                  <Text style={[styles.sidebarTabText, active && styles.sidebarTabTextActive]}>{entry.label}</Text>
                  <Text style={styles.sidebarSectionText}>{entry.section}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.sidebarFooter}>
            {!!user?.id && (
              <Pressable onPress={onLogout} style={styles.footerLogoutButton}>
                <Text style={styles.footerLogoutText}>ログアウト</Text>
              </Pressable>
            )}
            <Text style={styles.sidebarFooterTitle}>Prototype focus</Text>
            <Text style={styles.sidebarFooterText}>・Vote を左帯の目立つCTAへ移動</Text>
            <Text style={styles.sidebarFooterText}>・Events は右側で詳細比較</Text>
            <Text style={styles.sidebarFooterText}>・Admin を Web console として活用</Text>
          </View>
        </View>
        <View style={styles.desktopContent}>{children}</View>
      </View>
    );
  }

  return (
    <View style={styles.mobileRoot}>
      <View style={styles.userBar}>
        <Text style={styles.userText}>env: {appEnv} / auth: {authMode} / role: {user?.role ?? "guest"} / nickname: {user?.nickname ?? "(未登録)"} / x-user-id: {user?.id ?? "(未登録)"}</Text>
        {!!user?.id && (
          <Pressable onPress={onLogout}>
            <Text style={styles.logoutText}>ログアウト</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.mobileContent}>{children}</View>
      <View style={styles.tabBar}>
        {visibleTabs.map((entry) => (
          <Pressable key={entry.key} onPress={() => setTab(entry.key)}>
            <Text style={[styles.tabLabel, tab === entry.key && styles.active]}>{entry.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  desktopRoot: { flex: 1, flexDirection: "row", backgroundColor: colors.bg },
  sidebar: { width: 308, backgroundColor: "#10182E", paddingHorizontal: 18, paddingTop: 28, paddingBottom: 20, gap: 18, borderRightWidth: 1, borderRightColor: "#1F2A45" },
  brandBlock: { gap: 8 },
  brandEyebrow: { color: colors.accent, fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  brandTitle: { color: colors.text, fontSize: 28, fontWeight: "800" },
  metaText: { color: colors.subText, fontSize: 13, lineHeight: 18 },
  metaPanel: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  metaChip: { borderWidth: 1, borderColor: "#2B3554", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#141D34" },
  metaChipLabel: { color: "#7F8DB6", fontSize: 10, textTransform: "uppercase" },
  metaChipValue: { color: colors.text, fontSize: 12, fontWeight: "700" },
  voteSpotlight: { backgroundColor: colors.accent, borderRadius: 22, padding: 18, gap: 6, shadowColor: colors.accent, shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  voteSpotlightEyebrow: { color: "#17305D", fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  voteSpotlightTitle: { color: colors.bg, fontSize: 26, fontWeight: "800" },
  voteSpotlightText: { color: "#17305D", lineHeight: 18, fontWeight: "600" },
  navGroup: { gap: 8, flex: 1 },
  sidebarTab: { borderRadius: 14, borderWidth: 1, borderColor: "#2B3554", padding: 14, gap: 4, backgroundColor: "#121A30" },
  sidebarTabActive: { borderColor: colors.accent, backgroundColor: "#192443" },
  sidebarTabText: { color: colors.text, fontWeight: "700", fontSize: 15 },
  sidebarTabTextActive: { color: colors.accent },
  sidebarSectionText: { color: "#7F8DB6", fontSize: 11, textTransform: "uppercase" },
  sidebarFooter: { borderTopWidth: 1, borderTopColor: "#1F2A45", paddingTop: 12, gap: 6 },
  footerLogoutButton: { alignSelf: "flex-start", backgroundColor: "#141D34", borderRadius: 999, borderWidth: 1, borderColor: "#2B3554", paddingHorizontal: 12, paddingVertical: 8 },
  footerLogoutText: { color: colors.text, fontWeight: "700", fontSize: 12 },
  sidebarFooterTitle: { color: colors.text, fontWeight: "700" },
  sidebarFooterText: { color: colors.subText, fontSize: 12 },
  desktopContent: { flex: 1 },
  mobileRoot: { flex: 1, backgroundColor: "#0E1428" },
  mobileContent: { flex: 1 },
  userBar: { minHeight: 28, backgroundColor: "#0E1428", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 10, flexDirection: "row", gap: 8 },
  userText: { color: "#7F8DB6", fontSize: 11, flex: 1 },
  logoutText: { color: colors.accent, fontSize: 11, fontWeight: "700" },
  tabBar: { minHeight: 56, backgroundColor: colors.card, flexDirection: "row", justifyContent: "space-around", alignItems: "center", flexWrap: "wrap", paddingHorizontal: 4, paddingVertical: 6 },
  tabLabel: { color: colors.subText, fontSize: 10, marginHorizontal: 2 },
  active: { color: colors.accent, fontWeight: "700" },
});
