import React, { FC, ReactNode } from "react";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { Box, Center, Container, Flex, Spacer } from "@chakra-ui/layout";
import { Image } from "@chakra-ui/react";
import { Constraint } from "./Constraint";

export const Header: FC = () => {
  return (
    <Constraint>
      <Box>
        <Image
          boxSize="40px"
          src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/23f5TH1tFkfX6jPVQNy4VQ66Fo32WUc8zrZT1c14LzBM/logo.png"
        />
      </Box>
      <Spacer />
      <Box>
        <WalletModalProvider>
          <WalletMultiButton style={{}} />
        </WalletModalProvider>
      </Box>
    </Constraint>
  );
};
