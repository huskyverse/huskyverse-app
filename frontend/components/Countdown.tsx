import { BN } from "@project-serum/anchor";
import { FC, useState } from "react";

import CountdownT from "react-countdown";
import { Center, Container } from "@chakra-ui/react";
import { usePhaseInfo } from "../hooks/usePhaseInfo";

export const Countdown: FC = () => {
  const phaseInfo = usePhaseInfo();

  return (
    <Container>
      {!phaseInfo.phase ? (
        <Center>"loading..."</Center>
      ) : phaseInfo.phase === "ESCROW_OVER" ? (
        <Center>the end</Center>
      ) : (
        <>
          <Center>{phaseInfo.phase}</Center>
          <Center>
            <CountdownT
              key={phaseInfo.phase}
              date={phaseInfo.endAt.toNumber() * 1000}
            />
          </Center>
        </>
      )}
    </Container>
  );
};
