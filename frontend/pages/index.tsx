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
    <Container>
      <Countdown />
      <Balance token="usdc" prefix="USDC" />
      <Deposit />
      <Balance token="redeemable" prefix="My Contribution" />
      <Withdraw />
      <Balance token="escrow" prefix="USDC Escrow" />
      <ClaimHKV />
      <Balance token="hkv" prefix="HKV" />
      <ClaimEscrowUSDC />
    </Container>
  );
};

export default Home;
