import { Container, Divider } from "@chakra-ui/react";
import type { NextPage } from "next";
import dynamic from "next/dynamic";
import {
  Balance,
  ClaimEscrowUSDC,
  ClaimHKV,
  PredictedResult,
  Withdraw,
} from "../components/Form";

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

      <PredictedResult />
      <Divider my="10" />

      <Balance token="pool_usdc" prefix="POOL <USDC>" />
      <Balance token="pool_huskyverse" prefix="POOL <HKV>" />

      <Divider my="10" />

      <Balance token="usdc" prefix="USDC" />
      <Deposit />
      <Balance token="redeemable" prefix="My Contribution" />
      <Withdraw />
      <Balance token="escrow" prefix="USDC Escrow" />
      <ClaimEscrowUSDC />
      <Balance token="hkv" prefix="HKV" />
      <ClaimHKV />
    </Container>
  );
};

export default Home;
