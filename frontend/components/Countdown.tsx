import { FC } from "react";

import CountdownT from "react-countdown";
import {
  Box,
  Center,
  Container,
  Grid,
  GridItem,
  Heading,
  Skeleton,
} from "@chakra-ui/react";
import { usePhaseInfo } from "../hooks/usePhaseInfo";
import { Glass } from "./Glass";

export const Countdown: FC = () => {
  const phaseInfo = usePhaseInfo();

  const Timer = ({ value, unit }: { value: string; unit: string }) => {
    return (
      <GridItem>
        <Center>
          <Heading>{value}</Heading>
        </Center>
        <Box>
          <Center>{unit}</Center>
        </Box>
      </GridItem>
    );
  };

  return (
    <Glass>
      <Skeleton isLoaded={!!phaseInfo.phase}>
        {!phaseInfo.phase ? (
          <>...</>
        ) : phaseInfo.phase === "ESCROW_OVER" ? (
          <Center>the end</Center>
        ) : (
          <>
            <Center>{phaseInfo.phase}</Center>
            <Center>
              <CountdownT
                key={phaseInfo.phase}
                date={phaseInfo.endAt.toNumber() * 1000}
                renderer={({ formatted }) => {
                  const { days, hours, minutes, seconds } = formatted;
                  return (
                    <Glass>
                      <Grid templateColumns="repeat(4, 1fr)" gap={6}>
                        <Timer value={days} unit="days" />
                        <Timer value={hours} unit="hours" />
                        <Timer value={minutes} unit="minutes" />
                        <Timer value={seconds} unit="seconds" />
                      </Grid>
                    </Glass>
                  );
                }}
              />
            </Center>
          </>
        )}
      </Skeleton>
    </Glass>
  );
};
