import {
  Program,
  Provider,
  setProvider,
  web3,
  BN,
} from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { FC, useEffect, useState } from "react";
import IDOPool from "ido-pool";
import idoPoolIdl from "../idl/ido_pool.json";
import useSWR from "swr";
import CountdownT from "react-countdown";
import { Center, Container, useInterval } from "@chakra-ui/react";

const useIdoAccount = () => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const idoAccountRes = useSWR("idoAccount", async () => {
    // ========== test ============

    // const s = new BN(Date.now() / 1000);
    // return {
    //   idoTimes: {
    //     startIdo: s.add(new BN(5)),
    //     endDeposits: s.add(new BN(10)),
    //     endIdo: s.add(new BN(15)),
    //     endEscrow: s.add(new BN(20)),
    //   },
    // };

    // ============================

    if (wallet) {
      setProvider(
        new Provider(connection, wallet, { commitment: "confirmed" })
      );

      const programId = new web3.PublicKey(
        "2E3Zkp8bU3sHR3Y1YsnJFCVMKDUA3qDLUJ2jyZXNEYxz" // TODO: extract this to config
      );

      //@ts-ignore
      const program = new Program(idoPoolIdl, programId);

      const idoPool = IDOPool({}, program, "huskyverse");

      const [ido] = await idoPool.accounts.ido();
      const idoAccount = await program.account.idoAccount.fetch(ido.toBase58());

      console.log(idoAccount);

      return idoAccount;
    }
  });

  // force update idoAccount swr on wallet update
  useEffect(() => {
    idoAccountRes.mutate();
  }, [wallet]);

  return idoAccountRes;
};
export const Countdown: FC = () => {
  const { data, error } = useIdoAccount();

  const [target, setTarget] = useState({
    stage: "",
    time: new BN(0),
  });
  const [now, setNow] = useState(new BN(Date.now() / 1000));

  const upcomingStage = (t: BN) => {
    const stages = ["startIdo", "endDeposits", "endIdo", "endEscrow"];

    if (data) {
      for (let s of stages) {
        if (t < data.idoTimes[s]) {
          return s;
        }
      }
    }
  };

  useInterval(() => {
    if (data) {
      const _now = new BN(Date.now() / 1000);
      setNow(_now);
      const nextStage = upcomingStage(_now);
      if (_now.gt(target.time) && nextStage) {
        setTarget({
          time: idoTimes[nextStage],
          stage: nextStage,
        });
      }
    }
  }, 100);

  const idoTimes = data ? data.idoTimes : {};

  return (
    <Container>
      {!data ? (
        "loading..."
      ) : upcomingStage(now) ? (
        <>
          <Center>{target.stage} in</Center>
          <Center>
            <CountdownT
              key={target.stage}
              date={target.time.toNumber() * 1000}
            />
          </Center>
        </>
      ) : (
        <Center>the end</Center>
      )}
    </Container>
  );
};
