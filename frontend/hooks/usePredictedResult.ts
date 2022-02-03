import { BN } from "@project-serum/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useEffect } from "react";
import useSWR from "swr";
import { toDecimalString } from "../lib/format";
import { tokenDecimals } from "../lib/token";
import { useIdoPool } from "./useIdoPool";
import { useTokenBalance } from "./userTokenBalance";

export const useRedeemableMint = () => {
  const { idoPool } = useIdoPool();
  const { connection } = useConnection();

  return useSWR("program/account/redeemable_mint", async () => {
    if (idoPool) {
      const [rm] = await idoPool.accounts.redeemableMint();

      const val = (await connection.getParsedAccountInfo(rm, "confirmed"))
        .value;

      if (!(val?.data instanceof Buffer)) {
        return val?.data.parsed.info;
      }
    }
  });
};

export const usePredictedResult = () => {
  const redeemable = useTokenBalance("redeemable");
  const poolUsdc = useTokenBalance("pool_usdc");
  const poolHuskyverse = useTokenBalance("pool_huskyverse");

  const redeemableMint = useRedeemableMint();

  const w = useWallet();

  const errZero = new Error("redeemable supply is 0");

  useEffect(() => {
    redeemable.mutate();
    poolUsdc.mutate();
    poolHuskyverse.mutate();
    redeemableMint.mutate();
  }, [w]);
  if (
    redeemable.data &&
    poolUsdc.data &&
    poolHuskyverse.data &&
    redeemableMint.data
  ) {
    const redeemableBN = new BN(redeemable.data.amount);
    const poolHuskyverseBN = new BN(poolHuskyverse.data.amount);
    const redeemableSupplyBN = new BN(redeemableMint.data.supply);

    if (redeemableSupplyBN.isZero() || poolHuskyverseBN.isZero()) {
      return { resultedHkv: errZero, price: errZero };
    }

    // increase the number size to handle small number size
    const diff = tokenDecimals.hkv - tokenDecimals.usdc;
    const OFFSET_CALC_SPACE = 10;

    const price = toDecimalString(
      redeemableSupplyBN
        .mul(new BN("1" + "0".repeat(diff) + "0".repeat(OFFSET_CALC_SPACE)))
        .div(poolHuskyverseBN),
      OFFSET_CALC_SPACE
    );

    const resultedHkv = toDecimalString(
      redeemableBN.mul(poolHuskyverseBN).div(redeemableSupplyBN),
      tokenDecimals.hkv
    );

    return { price, resultedHkv };
  }

  const errMissingData = new Error("missing data");
  return { resultedHkv: errMissingData, price: errMissingData };
};
