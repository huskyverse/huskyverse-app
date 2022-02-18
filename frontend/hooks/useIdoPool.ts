import { Program, Provider, setProvider, web3 } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import IDOPool from "ido-pool";
import idoPoolIdl from "../idl/ido_pool";
export const useIdoPool = () => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  if (wallet) {
    const provider = new Provider(connection, wallet, {
      commitment: "confirmed",
    });
    setProvider(provider);

    const programId = new web3.PublicKey(
      process.env.NEXT_PUBLIC_IDO_POOL_PROGRAM_ID as string
    );

    const program = new Program(idoPoolIdl, programId);

    return {
      program,
      provider,
      idoPool: IDOPool(provider, program, "huskyverse"),
    };
  }
  return {};
};
