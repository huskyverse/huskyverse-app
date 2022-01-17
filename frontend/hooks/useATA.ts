import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useEffect } from "react";
import useSWR from "swr";

const mint = {
  usdc: "7N51bsWy9kXmDP89kyPGqUxg576q8CNYf8Gp18HnsRAf",
  hkv: "csGJUUWKYgEw83kgrH9tWQpYcVYETWWQtwvXy1nWtkH",
};

export const useATA = (token: "usdc" | "hkv") => {
  const { publicKey } = useWallet();

  const res = useSWR(`user/${token}/ata`, async () => {
    if (publicKey) {
      return await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID, // always ASSOCIATED_TOKEN_PROGRAM_ID
        TOKEN_PROGRAM_ID, // always TOKEN_PROGRAM_ID
        new PublicKey(mint[token]), // mint
        publicKey // owner
      );
    } else {
      console.warn("some value are missing, can not fetch ata yet:", {
        publicKey,
      });
    }
  });

  useEffect(() => {
    res.mutate();
  }, [publicKey]);

  return res;
};
