import { Box, Divider, Grid, GridItem, StatGroup } from "@chakra-ui/react";
import type { NextPage } from "next";
import dynamic from "next/dynamic";
import { Constraint } from "../components/Constraint";
import {
  Balance,
  ClaimEscrowUSDC,
  ClaimHKV,
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

const Home: NextPage = () => {
  return (
    <Constraint>
      <Grid templateColumns="repeat(5, 1fr)" gap={8} width="100%">
        <GridItem colSpan={2}>
          <Box>
            <Phaser />
            <Glass>
              <Glass>
                <StatGroup>
                  <Balance token="pool_usdc" prefix="POOL <USDC>" />
                  <Balance token="pool_huskyverse" prefix="POOL <HKV>" />
                </StatGroup>
              </Glass>
              <PredictedResult />
            </Glass>
          </Box>
        </GridItem>
        <GridItem colSpan={3}>
          <Box>
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
          </Box>
        </GridItem>
      </Grid>
    </Constraint>
  );
};

export default Home;
