import { View, Text, Pressable, StyleSheet } from "react-native";
import { useState } from "react";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { EventListScreen } from "./src/screens/EventListScreen";
import { VoteHistoryScreen } from "./src/screens/VoteHistoryScreen";
import { AvatarScreen } from "./src/screens/AvatarScreen";
import { MyPageScreen } from "./src/screens/MyPageScreen";

const tabs = ["Onboarding", "Home", "Events", "History", "Avatar", "MyPage"] as const;
type Tab = (typeof tabs)[number];

export default function App() {
  const [tab, setTab] = useState<Tab>("Home");

  return (
    <View style={{ flex: 1 }}>
      {tab === "Onboarding" && <OnboardingScreen />}
      {tab === "Home" && <HomeScreen />}
      {tab === "Events" && <EventListScreen />}
      {tab === "History" && <VoteHistoryScreen />}
      {tab === "Avatar" && <AvatarScreen />}
      {tab === "MyPage" && <MyPageScreen />}
      <View style={styles.tabBar}>
        {tabs.map((t) => (
          <Pressable key={t} onPress={() => setTab(t)}>
            <Text style={[styles.tabLabel, tab === t && styles.active]}>{t}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 56,
    backgroundColor: "#151D33",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  tabLabel: { color: "#AAB4D4" },
  active: { color: "#5BA7FF", fontWeight: "700" },
});
