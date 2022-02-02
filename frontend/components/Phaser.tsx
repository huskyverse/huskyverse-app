import {
  CheckCircleIcon,
  ChevronRightIcon,
  QuestionIcon,
  QuestionOutlineIcon,
  TimeIcon,
} from "@chakra-ui/icons";
import {
  Box,
  Button,
  Center,
  Divider,
  Fade,
  Flex,
  Grid,
  GridItem,
  Heading,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Skeleton,
  Spacer,
  Stack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { FC, useState } from "react";
import CountdownT from "react-countdown";
import { Phase, usePhaseInfo } from "../hooks/usePhaseInfo";
import { Glass } from "./Glass";

const phases: Phase[] = ["PRE_IDO", "UNRESTRICTED", "WITHDRAW", "IDO_OVER"];

const displayPhase = (phase: Phase) => {
  const mapping: { [P in Phase]: string } = {
    PRE_IDO: "Be Prepared!",
    UNRESTRICTED: "Unrestricted (Contribute & Withdraw)",
    WITHDRAW: "Withdraw Only",
    IDO_OVER: "Concluded",
  };

  return mapping[phase];
};

const MotionChevronRightIcon = motion(ChevronRightIcon);

const Info: FC<{ header: string }> = ({ header, children }) => {
  const [hover, setHover] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const props = {
    position: "absolute" as "absolute",
    cursor: "pointer" as "pointer",
    focusable: true,
    marginTop: "auto",
    marginBottom: "auto",
    top: 0,
    bottom: 0,
    right: 0,
  };

  return (
    <>
      <Box
        position="relative"
        w={5}
        h={5}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={onOpen}
      >
        <Fade in={!hover}>
          <QuestionOutlineIcon {...props} />
        </Fade>
        <Fade in={hover} unmountOnExit={true}>
          <QuestionIcon {...props} />
        </Fade>
      </Box>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent p={5} bgColor="gray.900">
          <ModalHeader>{header}</ModalHeader>
          <ModalBody>{children}</ModalBody>

          <ModalFooter>
            <Button onClick={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export const Phaser: FC = () => {
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
      <Flex alignItems="center">
        <Heading as="h2" size="md">
          Phase
        </Heading>
        <Spacer />
        <Info header="Phase">
          HuskyVerse IDO is designed to be fair launch against bot. In order to
          acheive that, our IDO is separated into following phases.
          <Divider my={5} />
          <Heading size="sm" mb="2">
            {displayPhase("PRE_IDO")}
          </Heading>
          Nothing has started yet, but it will soon. Look out!
          <Divider my={5} />
          <Heading size="sm" mb="2">
            {displayPhase("UNRESTRICTED")}
          </Heading>
          In this phase, you can both contribute to the pool to get your HKV
          shares and, if you change your mind, you can always withdraw.
          <Divider my={5} />
          <Heading size="sm" mb="2">
            {displayPhase("WITHDRAW")}
          </Heading>
          Now, there will be some restriction on withdrawal. You can only
          withdraw once, and the amount you can withdraw will be decreasing
          linearly over time.
          <Divider my={5} />
          <Heading size="sm" mb="2">
            {displayPhase("IDO_OVER")}
          </Heading>
          IDO is concluded, you can now claim your HKV!
        </Info>
      </Flex>
      <Divider my="1em" />
      <Skeleton isLoaded={!!phaseInfo.phase}>
        {!phaseInfo.phase ? (
          <>...</>
        ) : (
          <>
            <Stack spacing={1.5}>
              {phases.map((p) => {
                const pText = displayPhase(p);

                if (
                  phases.indexOf(p) < phases.indexOf(phaseInfo.phase) ||
                  phaseInfo.phase === "IDO_OVER"
                ) {
                  return (
                    <Text fontSize="xs" color="whiteAlpha.400">
                      <CheckCircleIcon mr="1em" /> {pText}
                    </Text>
                  );
                }

                if (p === phaseInfo.phase) {
                  return (
                    <Heading size="sm" py="0.5em">
                      <MotionChevronRightIcon
                        ml="-5px"
                        animate={{ x: [0, 5, 0] }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                        }}
                        mr="1em"
                      />{" "}
                      {pText}
                    </Heading>
                  );
                }

                if (phases.indexOf(p) > phases.indexOf(phaseInfo.phase)) {
                  return (
                    <Text fontSize="xs" color="whiteAlpha.400">
                      <TimeIcon mr="1em" /> {pText}
                    </Text>
                  );
                }
              })}
            </Stack>
            {phaseInfo.phase !== "IDO_OVER" ? (
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
            ) : (
              <></>
            )}
          </>
        )}
      </Skeleton>
    </Glass>
  );
};
