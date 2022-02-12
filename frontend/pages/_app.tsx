import "@fontsource/poppins";
import "../styles/globals.css";
import type { AppProps } from "next/app";
import { Box, ChakraProvider, extendTheme } from "@chakra-ui/react";
import dynamic from "next/dynamic";
import Head from "next/head";
import { ReactNode } from "react";

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
  orange: {
    "50": "#FFF2E5",
    "100": "#FFDBB8",
    "200": "#FFC48A",
    "300": "#FFAD5C",
    "400": "#FF962E",
    "500": "#FF7F00",
    "600": "#CC6500",
    "700": "#994C00",
    "800": "#663300",
    "900": "#331900",
  },
  pink: {
    "50": "#FFE5F4",
    "100": "#FFB8E0",
    "200": "#FF8ACD",
    "300": "#FF5CB9",
    "400": "#FF2EA6",
    "500": "#FF0092",
    "600": "#CC0075",
    "700": "#990058",
    "800": "#66003A",
    "900": "#33001D",
  },
  navy: {
    "50": "#EAEAFB",
    "100": "#C5C4F3",
    "200": "#A19DEB",
    "300": "#7C77E4",
    "400": "#5751DC",
    "500": "#322BD4",
    "600": "#2822AA",
    "700": "#1E1A7F",
    "800": "#141155",
    "900": "#0A092B",
  },
};

const fonts = {
  heading: "Poppins",
  body: "Poppins",
};

const config = {
  initialColorMode: "dark",
  useSystemColorMode: false,
};

const styles = {
  global: {
    body: {
      bg: "#07061E",
    },
  },
};

const components = {
  Skeleton: {
    defaultProps: {
      startColor: "whiteAlpha.400",
      endColor: "blackAlpha.600",
    },
  },
  Input: {
    defaultProps: {
      focusBorderColor: "orange.100",
    },
  },
};

const theme = extendTheme({ config, colors, fonts, styles, components });

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider theme={theme}>
      <WalletConnectionProvider>
        <Head>
          <title>Huskyverse App</title>
        </Head>
        <Box
          position="fixed"
          width="100%"
          height="100vh"
          bgImage="https://assets.website-files.com/619c7e3bffe78eb124124e0f/61cc52c14b268def6e03a37b_Mask%20Group%2038.png"
          zIndex={-1}
        />
        <Header />
        <Component {...pageProps} />
      </WalletConnectionProvider>
    </ChakraProvider>
  );
}

export default MyApp;
