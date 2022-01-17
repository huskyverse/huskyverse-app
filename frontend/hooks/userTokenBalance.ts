import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useEffect } from "react";
import useSWR from "swr";
import { useIdoPool } from "./useIdoPool";

type IDOToken = "usdc" | "redeemable" | "hkv";

const mint = {
  usdc: "7N51bsWy9kXmDP89kyPGqUxg576q8CNYf8Gp18HnsRAf",
  hkv: "csGJUUWKYgEw83kgrH9tWQpYcVYETWWQtwvXy1nWtkH",
};

export const useTokenBalance = (token: IDOToken) => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { idoPool } = useIdoPool();

  const res = useSWR(`user/${token}`, async () => {
    if (connection && publicKey && idoPool) {
      let acc: PublicKey;

      if (token === "redeemable") {
        acc = (await idoPool.accounts.userRedeemable(publicKey))[0];
      } else {
        acc = await Token.getAssociatedTokenAddress(
          ASSOCIATED_TOKEN_PROGRAM_ID, // always ASSOCIATED_TOKEN_PROGRAM_ID
          TOKEN_PROGRAM_ID, // always TOKEN_PROGRAM_ID
          new PublicKey(mint[token]), // mint
          publicKey // owner
        );
      }

      const tkb = await connection.getTokenAccountBalance(acc, "confirmed");
      return tkb.value;
    } else {
      console.warn("some value are missing, can not fetch token balance yet:", {
        connection,
        publicKey,
        idoPool,
      });
    }
  });

  useEffect(() => {
    res.mutate();
  }, [connection, publicKey]);

  return res;
};
