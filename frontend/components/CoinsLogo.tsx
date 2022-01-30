import { forwardRef, Img, ImgProps } from "@chakra-ui/react";

const Logo = forwardRef<ImgProps, "img">((props, ref) => (
  <Img
    ref={ref}
    verticalAlign="text-bottom"
    display="inline"
    boxSize="1.5em"
    {...props}
  ></Img>
));

export const UsdcLogo = forwardRef<ImgProps, "img">((props, ref) => (
  <Logo
    src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png"
    ref={ref}
    {...props}
  />
));

export const HkvLogo = forwardRef<ImgProps, "img">((props, ref) => (
  <Logo
    src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/23f5TH1tFkfX6jPVQNy4VQ66Fo32WUc8zrZT1c14LzBM/logo.png"
    ref={ref}
    {...props}
  />
));
