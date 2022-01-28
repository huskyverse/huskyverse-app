import { useInterval } from "@chakra-ui/react";
import { BN } from "@project-serum/anchor";
import { useState } from "react";
import { useIdoAccount } from "./useIdoAccount";

export type Phase = "PRE_IDO" | "UNRESTRICTED" | "WITHDRAW" | "IDO_OVER";

export const usePhaseInfo = (interval = 100) => {
  const { data, error } = useIdoAccount();

  const [mark, setMark] = useState({
    type: "",
    startAt: new BN(0),
  });

  const upcomingMark = (t: BN) => {
    const marks = ["startIdo", "endDeposits", "endIdo"];

    if (data) {
      for (let m of marks) {
        if (t < data.idoTimes[m]) {
          return m;
        }
      }
      return "noNextMark";
    }
  };

  useInterval(() => {
    if (data) {
      const now = new BN(Date.now() / 1000);
      const nextStage = upcomingMark(now);

      if (mark.type !== "noNextMark" && now.gt(mark.startAt) && nextStage) {
        setMark({
          startAt: data.idoTimes[nextStage],
          type: nextStage,
        });
      }
    }
  }, interval);

  const nextMarkToPhase: Record<string, Phase> = {
    startIdo: "PRE_IDO",
    endDeposits: "UNRESTRICTED",
    endIdo: "WITHDRAW",
    noNextMark: "IDO_OVER",
  };

  return {
    phase: nextMarkToPhase[mark.type],
    endAt: mark.startAt,
  };
};
