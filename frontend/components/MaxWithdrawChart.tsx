import { Box } from "@chakra-ui/react";
import React from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { usePhaseInfo } from "../hooks/usePhaseInfo";

const data = [
  {
    name: "Page A",
    uv: 100,
    pv: 100,
    amt: 2400,
  },
  {
    name: "Page B",
    uv: 0,
    pv: 0,
    amt: 2210,
  },
];

export const MaxWithdrawChart = () => {
  const currentPhaseInfo = usePhaseInfo();
  console.log(currentPhaseInfo.phase);

  if (currentPhaseInfo.phase !== "WITHDRAW") return null;

  return (
    <Box my="5" height={150}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          width={200}
          height={60}
          data={data}
          margin={{
            right: 0,
            left: 0,
            bottom: 5,
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
            dataKey="uv"
            stroke="#ffffff"
            strokeWidth={2}
            fill="url(#colorUv)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
};
