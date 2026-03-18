import { Text } from "react-native";
import { ScreenTemplate } from "../components/ScreenTemplate";
import { VoteHistoryItem } from "../lib/types";

export function ResultDetailScreen({ result }: { result?: VoteHistoryItem }) {
  return (
    <ScreenTemplate title="ResultDetail">
      {!result && <Text style={{ color: "#AAB4D4" }}>ResultListから結果を選択してください。</Text>}
      {result && (
        <>
          <Text style={{ color: "#F4F7FF" }}>event: {result.event.title}</Text>
          <Text style={{ color: "#F4F7FF" }}>my option: {result.option.label}</Text>
          <Text style={{ color: "#F4F7FF" }}>status: {result.status}</Text>
          <Text style={{ color: "#F4F7FF" }}>bet: {result.inputBetPoints}</Text>
          <Text style={{ color: "#F4F7FF" }}>reward: {result.rewardPoints}</Text>
        </>
      )}
    </ScreenTemplate>
  );
}
