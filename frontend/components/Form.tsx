import {
  Button,
  Container,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  InputGroup,
  InputRightAddon,
  NumberInput,
  Stat,
  StatLabel,
  StatNumber,
} from "@chakra-ui/react";

import { useForm } from "react-hook-form";

import { Phase, usePhaseInfo } from "../hooks/usePhaseInfo";

import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { useIdoPool } from "../hooks/useIdoPool";
import { IDOToken, useTokenBalance } from "../hooks/userTokenBalance";
import {
  createATA,
  getATA,
  mintPubkey,
  toBN,
  tokenDecimals,
} from "../lib/token";
import { BN, web3 } from "@project-serum/anchor";

import { useIdoAccount } from "../hooks/useIdoAccount";
import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

function Counter({ value }: { value: string }) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const [prevValue, setPrevValue] = useState(0);

  useEffect(() => {
    const node = nodeRef.current;

    const controls = animate(prevValue, parseFloat(value), {
      duration: 1,
      type: "tween",
      ease: "circOut",
      onUpdate(value) {
        if (node) {
          node.textContent = new Intl.NumberFormat().format(value);
          setPrevValue(value);
        }
      },
    });

    return () => controls.stop();
  }, [value]);

  return <span ref={nodeRef} />;
}

// TODO: review mutation
export const Balance = ({
  token,
  prefix,
}: {
  token: IDOToken;
  prefix: string;
}) => {
  const { data, error } = useTokenBalance(token);
  return (
    <Container>
      <Stat>
        <StatLabel>{prefix}</StatLabel>
        <StatNumber>
          {error ? (
            "-"
          ) : data ? (
            <Counter value={data.uiAmountString || "0"} />
          ) : (
            "..."
          )}
        </StatNumber>
      </Stat>
    </Container>
  );
};

export const Deposit = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const wallet = useAnchorWallet();
  const phaseInfo = usePhaseInfo();
  const { idoPool } = useIdoPool();
  const disabled = phaseInfo.phase !== "UNRESTRICTED" && !!idoPool;

  const usdc = useTokenBalance("usdc");
  const redeemable = useTokenBalance("redeemable");

  const { handleSubmit, register, formState, reset } = useForm({
    defaultValues: {
      depositAmount: "",
    },
  });
  const { errors, isSubmitting } = formState;

  return (
    <Container my="5">
      <form
        onSubmit={handleSubmit(async (v) => {
          if (connection && publicKey && idoPool && wallet) {
            const usdcMint = mintPubkey("usdc");
            const huskyverseMint = mintPubkey("hkv");

            const amount = toBN(v.depositAmount, "usdc");
            const ata = await getATA(publicKey, "usdc");

            await idoPool.exchangeUsdcForRedeemable(
              { usdcMint, huskyverseMint },
              publicKey,
              ata,
              amount,
              undefined
            );

            await usdc.mutate();
            await redeemable.mutate();
            reset({ depositAmount: "" });
          }
        })}
      >
        <FormControl isInvalid={!!errors.depositAmount}>
          <FormLabel htmlFor="depositAmount"></FormLabel>
          <NumberInput>
            <InputGroup my="5">
              <Input
                disabled={disabled}
                variant={disabled ? "filled" : "outline"}
                placeholder="USDC amount you want to contribute"
                id="depositAmount"
                {...register("depositAmount", {
                  required: "deposit amount can't be blank",
                  pattern: {
                    value: new RegExp(
                      `^(\\d+)\\.?(\\d{0,${tokenDecimals["usdc"]}})$`
                    ),
                    message:
                      "input must be valid number and max decimal places is " +
                      tokenDecimals["usdc"],
                  },
                  validate: (v) =>
                    (!!usdc.data &&
                      toBN(v, "usdc").lte(new BN(usdc.data.amount))) ||
                    "not enough USDC",
                })}
              />
              <InputRightAddon>USDC</InputRightAddon>
            </InputGroup>
            <FormErrorMessage my="5">
              {errors.depositAmount && errors.depositAmount.message}
            </FormErrorMessage>
          </NumberInput>
          <Button
            isLoading={isSubmitting}
            disabled={disabled}
            w="full"
            type="submit"
          >
            Deposit
          </Button>
        </FormControl>
      </form>
    </Container>
  );
};

const useIdoTime = (idoTime: string) => {
  const _ido = useIdoAccount();

  return {
    ..._ido,
    data: new Date(_ido.data?.idoTimes[idoTime].muln(1000).toNumber()),
  };
};

// NOTE: USDC here is represented in terms of redeemable
export const Withdraw = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const wallet = useAnchorWallet();
  const currentPhaseInfo = usePhaseInfo();
  const { idoPool } = useIdoPool();
  const endEscrowTime = useIdoTime("endEscrow");

  // >>> TOUCHED
  const activePhases: Phase[] = ["UNRESTRICTED", "WITHDRAW"];
  const disabled =
    !activePhases.some(
      (activePhase) => currentPhaseInfo.phase === activePhase
    ) && !!idoPool;
  // <<< TOUCHED

  const redeemable = useTokenBalance("redeemable");
  const escrow = useTokenBalance("escrow");

  // >>> TOUCHED
  const { handleSubmit, register, formState, reset } = useForm({
    defaultValues: {
      withdrawalAmount: "",
    },
  });
  // <<< TOUCHED

  const { errors, isSubmitting } = formState;

  return (
    <Container my="5">
      <form
        onSubmit={handleSubmit(async (v) => {
          if (connection && publicKey && idoPool && wallet) {
            const usdcMint = mintPubkey("usdc");
            const huskyverseMint = mintPubkey("hkv");

            const amount = toBN(v.withdrawalAmount, "usdc");

            await idoPool.exchangeRedeemableForUsdc(
              { usdcMint, huskyverseMint },
              publicKey,
              amount
            );

            await redeemable.mutate();
            await escrow.mutate();
            reset({ withdrawalAmount: "" });
          }
        })}
      >
        <FormControl isInvalid={!!errors.withdrawalAmount}>
          <FormLabel htmlFor="depositAmount"></FormLabel>
          <NumberInput>
            <InputGroup my="5">
              <Input
                disabled={disabled}
                variant={disabled ? "filled" : "outline"}
                // >>> TOUCHED
                placeholder="USDC amount you want to withdraw from contribution"
                // <<< TOUCHED
                id="withdrawAmount"
                {...register("withdrawalAmount", {
                  required: "withdrawal amount can't be blank",
                  pattern: {
                    value: new RegExp(
                      `^(\\d+)\\.?(\\d{0,${tokenDecimals["usdc"]}})$`
                    ),
                    message:
                      "input must be valid number and max decimal places is " +
                      tokenDecimals["usdc"],
                  },
                  validate: (v) =>
                    (!!redeemable.data &&
                      toBN(v, "usdc").lte(new BN(redeemable.data.amount))) ||
                    "not enough contributed USDC to withdraw from",
                })}
              />
              <InputRightAddon>USDC</InputRightAddon>
            </InputGroup>
            <FormErrorMessage my="5">
              {errors.withdrawalAmount && errors.withdrawalAmount.message}
            </FormErrorMessage>
          </NumberInput>
          <Button
            isLoading={isSubmitting}
            disabled={disabled}
            w="full"
            type="submit"
          >
            Withdraw USDC Contribution to Escrow
          </Button>
          {/* TODO: Check if this is correct date time for Locale */}
          <sub>locked until .. {endEscrowTime.data?.toLocaleString()}</sub>
        </FormControl>
      </form>
    </Container>
  );
};

// check if user redeemable account still exists
export const ClaimHKV = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const wallet = useAnchorWallet();
  const currentPhaseInfo = usePhaseInfo();
  const { idoPool, provider } = useIdoPool();
  const activePhases: Phase[] = ["IDO_OVER", "ESCROW_OVER"];
  const disabled =
    !activePhases.some(
      (activePhase) => currentPhaseInfo.phase === activePhase
    ) && !!idoPool;

  const hkv = useTokenBalance("hkv");
  const redeemable = useTokenBalance("redeemable");

  const { handleSubmit, formState } = useForm();
  const { isSubmitting } = formState;

  return (
    <Container my="5">
      <form
        onSubmit={handleSubmit(async () => {
          if (
            connection &&
            publicKey &&
            idoPool &&
            wallet &&
            redeemable.data &&
            provider
          ) {
            const huskyverseMint = mintPubkey("hkv");

            const amount = redeemable.data.amount;

            let ata;
            try {
              ata = await createATA(publicKey, "hkv", provider);
            } catch (_e) {
              console.warn(_e);
              ata = await getATA(publicKey, "hkv");
            }

            console.log("ata ", ata.toBase58());
            console.log("pubk ", publicKey.toBase58());
            console.log("amount", amount);

            await idoPool.exchangeRedeemableForHuskyverse(
              { huskyverseMint },
              ata,
              publicKey,
              new BN(amount),
              undefined
            );

            await hkv.mutate();
            await redeemable.mutate();
          }
        })}
      >
        <Button
          isLoading={isSubmitting}
          disabled={disabled}
          w="full"
          type="submit"
        >
          Claim All HKV
        </Button>
      </form>
    </Container>
  );
};

// TODO: withdraw from escrow
export const ClaimEscrowUSDC = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const wallet = useAnchorWallet();
  const currentPhaseInfo = usePhaseInfo();
  const { idoPool, provider } = useIdoPool();
  const activePhases: Phase[] = ["ESCROW_OVER"];
  const disabled =
    !activePhases.some(
      (activePhase) => currentPhaseInfo.phase === activePhase
    ) && !!idoPool;

  const usdc = useTokenBalance("usdc");
  const escrowUsdc = useTokenBalance("escrow");

  const { handleSubmit, formState } = useForm();
  const { isSubmitting } = formState;

  return (
    <Container my="5">
      <form
        onSubmit={handleSubmit(async () => {
          if (
            connection &&
            publicKey &&
            idoPool &&
            wallet &&
            escrowUsdc.data &&
            provider
          ) {
            const usdcMint = mintPubkey("usdc");

            const amount = escrowUsdc.data.amount;

            let ata;
            try {
              ata = await createATA(publicKey, "usdc", provider);
            } catch (_e) {
              console.warn(_e);
              ata = await getATA(publicKey, "usdc");
            }

            await idoPool.withdrawFromEscrow(
              { usdcMint },
              ata,
              publicKey,
              new BN(amount)
            );

            await usdc.mutate();
            await escrowUsdc.mutate();
          }
        })}
      >
        <Button
          isLoading={isSubmitting}
          disabled={disabled}
          w="full"
          type="submit"
        >
          Claim All Locked USDC
        </Button>
      </form>
    </Container>
  );
};
