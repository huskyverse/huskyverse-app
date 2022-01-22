import { Box, Container, Divider, StatGroup } from "@chakra-ui/react";
import type { NextPage } from "next";
import dynamic from "next/dynamic";
import {
  Balance,
  ClaimEscrowUSDC,
  ClaimHKV,
  PredictedResult,
  Withdraw,
} from "../components/Form";
import { Glass } from "../components/Glass";

const Countdown = dynamic<{}>(
  () => import("../components/Countdown").then(({ Countdown }) => Countdown),
  {
    ssr: false,
  }
);

const Deposit = dynamic<{}>(
  () => import("../components/Form").then(({ Deposit }) => Deposit),
  {
    ssr: false,
  }
);

const Home: NextPage = () => {
  return (
    <Container my="16">
      <Countdown />

      <Glass>
        <Glass>
          <StatGroup>
            <Balance token="pool_usdc" prefix="POOL <USDC>" />
            <Balance token="pool_huskyverse" prefix="POOL <HKV>" />
          </StatGroup>
        </Glass>
        <PredictedResult />
      </Glass>

      <Divider my="10" />

      <Box>
        <Glass>
          <Glass>
            <Balance token="usdc" prefix="USDC" />
            <Deposit />
          </Glass>
          <Glass>
            <Balance token="redeemable" prefix="My Contribution" />
            <Withdraw />
          </Glass>
          <Glass>
            <Balance token="escrow" prefix="USDC Escrow" />
            <ClaimEscrowUSDC />
          </Glass>
        </Glass>
      </Box>
      <Divider my="10" />
      <Box>
        <Glass>
          <Balance token="hkv" prefix="HKV" />
          <ClaimHKV />
        </Glass>
      </Box>
    </Container>
  );
};

export default Home;
