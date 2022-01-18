import React, { FC, ReactNode } from "react";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { Box, Container, Flex, Spacer } from "@chakra-ui/layout";
import { Image } from "@chakra-ui/react";

export const Header: FC = () => {
  return (
    <Box px="16" py="5" backgroundColor="grey.900">
      <Flex align="center" justify="center">
        <Container>
          <Image
            boxSize="50px"
            src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/23f5TH1tFkfX6jPVQNy4VQ66Fo32WUc8zrZT1c14LzBM/logo.png"
          />
        </Container>
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
