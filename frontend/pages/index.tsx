import { Container } from "@chakra-ui/react";
import type { NextPage } from "next";
import dynamic from "next/dynamic";
import {
  Balance,
  ClaimEscrowUSDC,
  ClaimHKV,
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
