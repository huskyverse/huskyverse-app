import React, { FC, ReactNode } from "react";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { Box, Container, Flex, Spacer } from "@chakra-ui/layout";

export const Header: FC = () => {
  return (
    <Box px="10" py="5" backgroundColor="grey.900">
      <Flex align="center" justify="center">
        <Container>HuskyVerse</Container>
        <Spacer />
        <Box>
          <WalletModalProvider>
            <WalletMultiButton style={{}} />
          </WalletModalProvider>
        </Box>
      </Flex>
    </Box>
  );
};
