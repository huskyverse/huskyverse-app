import "../styles/globals.css";
import type { AppProps } from "next/app";
import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import dynamic from "next/dynamic";
import { FC, ReactNode } from "react";

// Use require instead of import, and order matters
require("../styles/globals.css");
require("@solana/wallet-adapter-react-ui/styles.css");
require("../styles/wallet-adapter.css");

const WalletConnectionProvider = dynamic<{ children: ReactNode }>(
  () =>
    import("../components/WalletConnectionProvider").then(
      ({ WalletConnectionProvider }) => WalletConnectionProvider
    ),
  {
    ssr: false,
  }
);

const Header = dynamic<{}>(
  () => import("../components/Header").then(({ Header }) => Header),
  {
    ssr: false,
  }
);

// tobe added: our theme colors
const colors = {
  brand: {
    900: "#1a365d",
    800: "#153e75",
    700: "#2a69ac",
  },
};

const theme = extendTheme({ colors });

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider theme={theme}>
      <WalletConnectionProvider>
        <Header />
        <Component {...pageProps} />
      </WalletConnectionProvider>
    </ChakraProvider>
  );
}

export default MyApp;
