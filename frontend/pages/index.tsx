import { Container } from "@chakra-ui/react";
import type { NextPage } from "next";
import dynamic from "next/dynamic";

import { Deposit } from "../components/Deposit";

const Countdown = dynamic<{}>(
  () => import("../components/Countdown").then(({ Countdown }) => Countdown),
  {
    ssr: false,
  }
);

const Deposit = dynamic<{}>(
  () => import("../components/Deposit").then(({ Deposit }) => Deposit),
  {
    ssr: false,
  }
);

const Home: NextPage = () => {
  return (
    <Container>
      <Countdown />
      <Deposit />
    </Container>
  );
};

export default Home;
