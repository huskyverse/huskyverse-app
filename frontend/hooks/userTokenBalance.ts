import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useEffect } from "react";
import useSWR from "swr";
import { getATA } from "../lib/token";
import { useIdoPool } from "./useIdoPool";

export type IDOToken =
  | "usdc"
  | "redeemable"
  | "escrow"
  | "pool_usdc"
  | "pool_huskyverse"
  | "hkv";

export const useTokenBalance = (token: IDOToken) => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { idoPool } = useIdoPool();

  const res = useSWR(`user/${token}/balance`, async () => {
    if (connection && publicKey && idoPool) {
      let acc: PublicKey;

      if (token === "redeemable") {
        acc = (await idoPool.accounts.userRedeemable(publicKey))[0];
      } else if (token === "escrow") {
        acc = (await idoPool.accounts.escrowUsdc(publicKey))[0];
      } else if (token === "pool_usdc") {
        acc = (await idoPool.accounts.poolUsdc())[0];
      } else if (token === "pool_huskyverse") {
        acc = (await idoPool.accounts.poolHuskyverse())[0];
      } else {
        acc = await getATA(publicKey, token);
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
