import { useEffect } from "react";
import IDOPool from "ido-pool";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import idoPoolIdl from "../idl/ido_pool.json";
import useSWR from "swr";
import {
  BN,
  Program,
  Provider,
  setProvider,
  web3,
} from "@project-serum/anchor";
import { useMockData } from "./useMockData";

export const useIdoAccount = () => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const idoAccountRes = useSWR("idoAccount", async () => {
    // MOCK DATA FORE DEVELOPMENT ONLY
    if (useMockData()) {
      const s = new BN(Date.now() / 1000);
      return {
        idoTimes: {
          startIdo: s.add(new BN(5)),
          endDeposits: s.add(new BN(10)),
          endIdo: s.add(new BN(15)),
          endEscrow: s.add(new BN(20)),
        },
      };
    }

    if (wallet) {
      setProvider(
        new Provider(connection, wallet, { commitment: "confirmed" })
      );

      const programId = new web3.PublicKey(
        "2E3Zkp8bU3sHR3Y1YsnJFCVMKDUA3qDLUJ2jyZXNEYxz" // TODO: extract this to config
      );

      //   @ts-ignore
      const program = new Program(idoPoolIdl, programId);

      const idoPool = IDOPool({}, program, "huskyverse");

      const [ido] = await idoPool.accounts.ido();
      const idoAccount = await program.account.idoAccount.fetch(ido.toBase58());

      return idoAccount;
    }
  });

  // force update idoAccount swr on wallet update
  useEffect(() => {
    idoAccountRes.mutate();
  }, [wallet]);

  return idoAccountRes;
};
