import { Program, Provider, setProvider, web3 } from "@project-serum/anchor";
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useIdoPool } from "./useIdoPool";
import useSWR from "swr";
import { useEffect } from "react";
export const useLinearWithdrawDecreaseInfo = () => {
  const { publicKey, wallet } = useWallet();
  const { idoPool, program } = useIdoPool();
  const { connection } = useConnection();

  const swr = useSWR("program/account/withdraw_linear_decrease", async () => {
    if (idoPool && program) {
      const [rm] = await idoPool.accounts.userWithdrawLinearDecrease(publicKey);

      const data = await program.account.linearDecreaseWithdrawAccount.fetch(rm.toBase58());
      return data
    }
  });

  useEffect(() => {
    swr.mutate();
  }, [connection, wallet, idoPool, program]);

  return swr;
};
