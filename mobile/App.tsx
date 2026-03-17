import { View, Text, Pressable, StyleSheet } from "react-native";
import { useState } from "react";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { EventListScreen } from "./src/screens/EventListScreen";
import { VoteHistoryScreen } from "./src/screens/VoteHistoryScreen";
import { AvatarScreen } from "./src/screens/AvatarScreen";
import { MyPageScreen } from "./src/screens/MyPageScreen";
import { VoteScreen } from "./src/screens/VoteScreen";
import { ResultListScreen } from "./src/screens/ResultListScreen";
import { User } from "./src/lib/types";

const tabs = ["Onboarding", "Home", "Events", "Vote", "History", "Results", "Avatar", "MyPage"] as const;
type Tab = (typeof tabs)[number];

export default function App() {
  const [tab, setTab] = useState<Tab>("Onboarding");
  const [user, setUser] = useState<User | null>(null);

  return (
    <View style={{ flex: 1 }}>
      {tab === "Onboarding" && (
        <OnboardingScreen
          onDone={(u) => {
            setUser(u);
            setTab("Home");
          }}
        />
      )}
      {tab === "Home" && <HomeScreen userId={user?.id} />}
      {tab === "Events" && <EventListScreen userId={user?.id} />}
      {tab === "Vote" && <VoteScreen userId={user?.id} />}
      {tab === "History" && <VoteHistoryScreen userId={user?.id} />}
      {tab === "Results" && <ResultListScreen userId={user?.id} />}
      {tab === "Avatar" && <AvatarScreen userId={user?.id} />}
      {tab === "MyPage" && <MyPageScreen userId={user?.id} />}
      <View style={styles.userBar}>
        <Text style={styles.userText}>x-user-id: {user?.id ?? "(未登録)"}</Text>
      </View>
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
  userBar: {
    height: 28,
    backgroundColor: "#0E1428",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  userText: { color: "#7f8db6", fontSize: 11 },
  tabBar: {
    height: 56,
    backgroundColor: "#151D33",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  tabLabel: { color: "#AAB4D4", fontSize: 12 },
  active: { color: "#5BA7FF", fontWeight: "700" },
});
