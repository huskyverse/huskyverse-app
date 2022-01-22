import { Program, Provider, setProvider, web3 } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import idoPoolIdl from "../idl/ido_pool";
import IDOPool from "ido-pool";
export const useIdoPool = () => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  let provider;
  if (wallet) {
    provider = new Provider(connection, wallet, {
      commitment: "confirmed",
    });
    setProvider(provider);
  }

  const programId = new web3.PublicKey(
    "2E3Zkp8bU3sHR3Y1YsnJFCVMKDUA3qDLUJ2jyZXNEYxz" // TODO: extract this to config
  );

  const program = new Program(idoPoolIdl, programId);
  const idoPool = IDOPool(provider, program, "huskyverse");

  return {
    program,
    provider,
    idoPool,
  };
};
