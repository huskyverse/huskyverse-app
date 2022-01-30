import {
  Box,
  Divider,
  Grid,
  GridItem,
  Heading,
  Text,
  StatGroup,
} from "@chakra-ui/react";
import { ArrowForwardIcon } from "@chakra-ui/icons";
import type { NextPage } from "next";
import dynamic from "next/dynamic";
import { HkvLogo, UsdcLogo } from "../components/CoinsLogo";
import { Constraint } from "../components/Constraint";
import {
  Balance,
  ClaimEscrowUSDC,
  ClaimHKV,
  PredictedHKV,
  PredictedResult,
  Withdraw,
} from "../components/Form";
import { Glass } from "../components/Glass";

const Phaser = dynamic<{}>(
  () => import("../components/Phaser").then(({ Phaser }) => Phaser),
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

const Stats = () => {
  return (
    <Glass>
      <Heading as="h2" size="md">
        Stats
      </Heading>
      <Divider my="1em" />
      <Glass>
        <Heading size="sm">Pools</Heading>
        <Divider my={5} />
        <StatGroup>
          <Balance
            token="pool_usdc"
            prefix={
              <Box>
                USDC <UsdcLogo />
              </Box>
            }
          />
          <Balance
            token="pool_huskyverse"
            prefix={
              <Box>
                HKV <HkvLogo />
              </Box>
            }
          />
        </StatGroup>
      </Glass>
      <PredictedResult />
    </Glass>
  );
};

const Home: NextPage = () => {
  return (
    <Constraint>
      <Grid templateColumns="repeat(5, 1fr)" gap={8} width="100%">
        <GridItem colSpan={3}>
          <Box>
            <Box>
              <Glass>
                <Heading as="h2" size="md">
                  My IDO Dashboard
                </Heading>
                <Divider my="1em" />
                <Glass>
                  <Balance
                    token="usdc"
                    prefix={
                      <>
                        My USDC <UsdcLogo />
                      </>
                    }
                  />
                  <Deposit />
                </Glass>
                <Glass>
                  <StatGroup>
                    <Balance
                      token="redeemable"
                      prefix={
                        <>
                          My Contribution{" "}
                          <Text as="sup">
                            [USDC <UsdcLogo />]
                          </Text>
                        </>
                      }
                    />

                    <PredictedHKV />
                  </StatGroup>
                  <Withdraw />
                  <ClaimHKV />

                  <Divider my="1em" />
                  <Text fontSize="sm" as="i">
                    ** Claimable HKV will be flucuated according to ratio
                    between your contribution and total USDC in USDC pool. Final
                    claimable HKV will be concluded in the `Concluded` phase.
                  </Text>
                </Glass>
                <Glass>
                  <StatGroup>
                    <Balance
                      token="hkv"
                      prefix={
                        <>
                          My HKV <HkvLogo />
                        </>
                      }
                    />
                  </StatGroup>
                </Glass>
              </Glass>
            </Box>
          </Box>
        </GridItem>

        <GridItem colSpan={2}>
          <Box>
            <Phaser />
            <Stats />
          </Box>
        </GridItem>
      </Grid>
    </Constraint>
  );
};

export default Home;
