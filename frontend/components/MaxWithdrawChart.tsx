import { Box } from "@chakra-ui/react";
import { BN } from "@project-serum/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import React, { useMemo } from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { useIdoAccount } from "../hooks/useIdoAccount";
import { usePhaseInfo } from "../hooks/usePhaseInfo";
import { useTokenBalance } from "../hooks/userTokenBalance";

type ChartData = {
  amount: number;
  datetime: number;
}[];

interface IdoTimes {
  startIdo: BN;
  endDeposits: BN;
  endIdo: BN;
}

const calcMaxRedeemable = ({ endDeposits, endIdo }: IdoTimes) => {
  const nowBn = new BN(Date.now() / 1000);
  return endIdo.sub(nowBn).mul(new BN(100)).div(endIdo.sub(endDeposits));
};

const genChartData = (
  original: number,
  { endDeposits, endIdo }: IdoTimes
): ChartData => {
  return [
    {
      amount: original,
      datetime: endDeposits.toNumber(),
    },
    {
      amount: 0,
      datetime: endIdo.toNumber(),
    },
  ];
};

export const MaxWithdrawChart = () => {
  const currentPhaseInfo = usePhaseInfo();
  const { data: idoData } = useIdoAccount();
  const { data: balance } = useTokenBalance("redeemable");
  const { wallet } = useWallet();

  const maxRedeemable = useMemo(
    () => idoData && calcMaxRedeemable(idoData.idoTimes),
    [idoData]
  )?.toNumber();
  const originalRedeemable = balance?.uiAmount;

  const chartData = useMemo(() => {
    if (wallet && originalRedeemable && idoData) {
      return genChartData(originalRedeemable, idoData.idoTimes);
    }
    return [];
  }, [wallet, originalRedeemable, idoData]);

  if (
    currentPhaseInfo.phase !== "WITHDRAW" ||
    !maxRedeemable ||
    !originalRedeemable ||
    !chartData.length
  )
    return null;

  return (
    <Box my="5" height={150} position="relative">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{
            right: 0,
            left: 0,
          }}
        >
          <defs>
            <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ffffff" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#ffffff"
            strokeWidth={2}
            fill="url(#colorUv)"
          />
        </AreaChart>
      </ResponsiveContainer>

      <Box
        position="absolute"
        height={`${maxRedeemable}%`}
        bottom={0}
        right={`${maxRedeemable}%`}
        transition="all"
      >
        <div
          style={{
            height: "100%",
            width: "1px",
            backgroundColor: "white",
            opacity: 0.2,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "-4px",
            left: "-3px",
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            backgroundColor: "#fff",
          }}
        />
      </Box>
    </Box>
  );
};
