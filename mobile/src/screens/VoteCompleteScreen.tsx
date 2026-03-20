import { Text } from "react-native";
import { ScreenTemplate } from "../components/ScreenTemplate";
import { VoteCreateResponse } from "../lib/types";

export function VoteCompleteScreen({ vote }: { vote?: VoteCreateResponse }) {
  return (
    <ScreenTemplate title="VoteComplete">
      {!vote && <Text style={{ color: "#AAB4D4" }}>投票完了後に内容が表示されます。</Text>}
      {vote && (
        <>
          <Text style={{ color: "#F4F7FF" }}>voteId: {vote.id}</Text>
          <Text style={{ color: "#F4F7FF" }}>eventId: {vote.eventId}</Text>
          <Text style={{ color: "#F4F7FF" }}>optionId: {vote.optionId}</Text>
          <Text style={{ color: "#F4F7FF" }}>inputBet: {vote.inputBetPoints}</Text>
          <Text style={{ color: "#F4F7FF" }}>consumed: {vote.actualConsumedPoints}</Text>
          <Text style={{ color: "#F4F7FF" }}>status: {vote.status}</Text>
        </>
      )}
    </ScreenTemplate>
  );
}
