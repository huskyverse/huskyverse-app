import { BN } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { useEffect } from "react";
import useSWR from "swr";
import { useIdoPool } from "./useIdoPool";
import { useMockData } from "./useMockData";

export const useIdoAccount = () => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const { idoPool, program } = useIdoPool();
  const idoAccountSWR = useSWR("program/ido", async () => {
    // MOCK DATA FORE DEVELOPMENT ONLY
    if (useMockData()) {
      const s = new BN(Date.now() / 1000);
      return {
        idoTimes: {
          startIdo: s.add(new BN(10)),
          endDeposits: s.add(new BN(20)),
          endIdo: s.add(new BN(30)),
          endEscrow: s.add(new BN(40)),
        },
      };
    }

    if (idoPool && program) {
      const [ido] = await idoPool.accounts.ido();
      const idoAccount = await program.account.idoAccount.fetch(ido.toBase58());

      return idoAccount;
    }
  });

  // force update idoAccount swr on wallet update
  useEffect(() => {
    idoAccountSWR.mutate();
  }, [connection, wallet]);

  return idoAccountSWR;
};
