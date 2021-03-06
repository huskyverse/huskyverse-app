import { LockIcon } from "@chakra-ui/icons";
import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  InputGroup,
  InputRightAddon,
  NumberInput,
  Skeleton,
  Stat,
  StatGroup,
  StatLabel,
  StatNumber,
  Text,
} from "@chakra-ui/react";
import { BN } from "@project-serum/anchor";
import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { animate } from "framer-motion";
import { ReactElement, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useIdoPool } from "../hooks/useIdoPool";
import { useLinearWithdrawDecreaseInfo } from "../hooks/useLinearWithdrawDecreaseInfo";
import { Phase, usePhaseInfo } from "../hooks/usePhaseInfo";
import {
  usePredictedResult,
  useRedeemableMint,
} from "../hooks/usePredictedResult";
import { IDOToken, useTokenBalance } from "../hooks/userTokenBalance";
import {
  getATA,
  getOrCreateATA,
  mintPubkey,
  toBN,
  tokenDecimals,
} from "../lib/token";
import { HkvLogo } from "./CoinsLogo";
import { Glass } from "./Glass";

function Counter({ value }: { value: string }) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const [prevValue, setPrevValue] = useState(0);

  useEffect(() => {
    const node = nodeRef.current;

    const controls = animate(prevValue, parseFloat(value), {
      duration: 1,
      type: "tween",
      ease: "circOut",
      onUpdate(currentValue) {
        if (node) {
          node.textContent = new Intl.NumberFormat(undefined, {
            maximumFractionDigits: currentValue === parseFloat(value) ? 10 : 2,
          }).format(currentValue);
          setPrevValue(currentValue);
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
  prefix: ReactElement | string;
}) => {
  const { data, error } = useTokenBalance(token);
  const { wallet } = useWallet();
  return (
    <Stat>
      <StatLabel>{prefix}</StatLabel>
      <StatNumber>
        {error ? (
          "-"
        ) : (
          <Skeleton isLoaded={!!data || !wallet}>
            {data ? <Counter value={data.uiAmountString || "0"} /> : "..."}
          </Skeleton>
        )}
      </StatNumber>
    </Stat>
  );
};

export const Price = () => {
  const res = usePredictedResult();
  const { wallet } = useWallet();
  const { price } = res || {};
  return (
    <Stat>
      <StatLabel>Price (HKV/USDC)</StatLabel>
      <Skeleton isLoaded={!!res || !wallet}>
        <StatNumber>
          {price instanceof Error ? (
            "-"
          ) : price ? (
            <Counter value={price} />
          ) : (
            "..."
          )}
        </StatNumber>
      </Skeleton>
    </Stat>
  );
};

export const PredictedHKV = () => {
  const res = usePredictedResult();
  const redeemable = useTokenBalance("redeemable");
  const { wallet } = useWallet();
  const { resultedHkv } = res || {};
  return (
    <Stat>
      <StatLabel>
        Claimable{" "}
        <Text as="sup">
          [HKV <HkvLogo />]
        </Text>{" "}
        **
      </StatLabel>
      <Skeleton isLoaded={!!res || !wallet}>
        <StatNumber>
          {resultedHkv instanceof Error || redeemable.error ? (
            "-"
          ) : resultedHkv ? (
            <Counter value={resultedHkv} />
          ) : (
            "..."
          )}
        </StatNumber>
      </Skeleton>
    </Stat>
  );
};

export const PredictedResult = () => {
  return (
    <Glass>
      <StatGroup>
        <Price />
      </StatGroup>
    </Glass>
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
  const poolUsdc = useTokenBalance("pool_usdc");
  const redeemableMint = useRedeemableMint();

  const amt = new BN(usdc.data?.amount || "0");

  const { handleSubmit, register, formState, reset } = useForm({
    defaultValues: {
      depositAmount: "",
    },
  });
  const { errors, isSubmitting } = formState;

  return (
    <Box my="5">
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
            await poolUsdc.mutate();
            await redeemableMint.mutate();
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
                    (!!usdc.data && toBN(v, "usdc").lte(amt)) ||
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
            Contribute
            {disabled ? (
              <Text as="sub">
                <LockIcon />
              </Text>
            ) : (
              ""
            )}
          </Button>
        </FormControl>
      </form>
    </Box>
  );
};

// NOTE: USDC here is represented in terms of redeemable
export const Withdraw = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const wallet = useAnchorWallet();
  const currentPhaseInfo = usePhaseInfo();
  const { idoPool, provider } = useIdoPool();
  const { data } = useLinearWithdrawDecreaseInfo();

  const [maxWithdraw, setMaxWithdraw] = useState(false);

  // >>> TOUCHED
  const activePhases: Phase[] = ["UNRESTRICTED", "WITHDRAW"];
  const disabled =
    !activePhases.some(
      (activePhase) => currentPhaseInfo.phase === activePhase
    ) ||
    (data !== undefined && data.withdrawn);
  // <<< TOUCHED

  const redeemable = useTokenBalance("redeemable");
  const usdc = useTokenBalance("usdc");
  const poolUsdc = useTokenBalance("pool_usdc");
  const redeemableMint = useRedeemableMint();

  const amt = new BN(redeemable.data?.amount || "0");
  // >>> TOUCHED
  const { handleSubmit, register, formState, reset, setValue } = useForm({
    defaultValues: {
      withdrawalAmount: "",
    },
  });
  // <<< TOUCHED

  const { errors, isSubmitting } = formState;

  return (
    <Box my="5">
      <form
        onSubmit={handleSubmit(async (v) => {
          if (connection && publicKey && idoPool && wallet && provider) {
            const usdcMint = mintPubkey("usdc");
            const huskyverseMint = mintPubkey("hkv");

            const amount = maxWithdraw
              ? "MAX"
              : toBN(v.withdrawalAmount, "usdc");
            const ata = await getOrCreateATA(provider, publicKey, "usdc");

            await idoPool.exchangeRedeemableForUsdc(
              { usdcMint, huskyverseMint },
              publicKey,
              ata,
              amount
            );

            await redeemable.mutate();
            await usdc.mutate();
            await poolUsdc.mutate();
            await redeemableMint.mutate();
            reset({ withdrawalAmount: "" });
          }
        })}
      >
        <FormControl isInvalid={!!errors.withdrawalAmount}>
          <FormLabel htmlFor="depositAmount"></FormLabel>
          <NumberInput>
            <InputGroup my="5">
              <Input
                disabled={disabled || maxWithdraw}
                variant={disabled ? "filled" : "outline"}
                // >>> TOUCHED
                placeholder={
                  maxWithdraw
                    ? "MAX WITHDRAWABLE AMOUNT"
                    : "USDC amount you want to withdraw"
                }
                // <<< TOUCHED
                id="withdrawAmount"
                {...register("withdrawalAmount", {
                  required: !maxWithdraw && "withdrawal amount can't be blank",
                  pattern: {
                    value: new RegExp(
                      `^(\\d+)\\.?(\\d{0,${tokenDecimals["usdc"]}})$`
                    ),
                    message:
                      "input must be valid number and max decimal places is " +
                      tokenDecimals["usdc"],
                  },
                  validate: (v) =>
                    maxWithdraw ||
                    (!!redeemable.data && toBN(v, "usdc").lte(amt)) ||
                    "not enough contributed USDC to withdraw from",
                })}
              />
              {/* <InputRightElement>
                
              </InputRightElement> */}
              <InputRightAddon>
                <Button
                  h="1.75rem"
                  size="sm"
                  marginRight="1rem"
                  disabled={disabled}
                  onClick={() => {
                    setValue("withdrawalAmount", "");
                    setMaxWithdraw((prev) => !prev);
                  }}
                >
                  {maxWithdraw ? "Cancel" : "Max"}
                </Button>
                USDC
              </InputRightAddon>
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
            Withdraw Contributed USDC
            {disabled ? (
              <Text as="sub">
                <LockIcon />
              </Text>
            ) : (
              ""
            )}
          </Button>
        </FormControl>
      </form>
    </Box>
  );
};

export const ClaimHKV = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const wallet = useAnchorWallet();
  const currentPhaseInfo = usePhaseInfo();
  const { idoPool, provider } = useIdoPool();
  const activePhases: Phase[] = ["IDO_OVER"];
  const disabled =
    !activePhases.some(
      (activePhase) => currentPhaseInfo.phase === activePhase
    ) && !!idoPool;

  const hkv = useTokenBalance("hkv");
  const redeemable = useTokenBalance("redeemable");
  const poolHuskyverse = useTokenBalance("pool_huskyverse");
  const redeemableMint = useRedeemableMint();

  const { handleSubmit, formState } = useForm();
  const { isSubmitting } = formState;

  return (
    <Box my="5">
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
            const ata = await getOrCreateATA(provider, publicKey, "hkv");

            await idoPool.exchangeRedeemableForHuskyverse(
              { huskyverseMint },
              ata,
              publicKey,
              new BN(amount),
              undefined
            );
          }
          await hkv.mutate();
          await redeemable.mutate();
          await poolHuskyverse.mutate();
          await redeemableMint.mutate();
        })}
      >
        <Button
          isLoading={isSubmitting}
          disabled={disabled}
          w="full"
          type="submit"
        >
          Claim HKV{" "}
          {disabled ? (
            <Text as="sub">
              <LockIcon />
            </Text>
          ) : (
            ""
          )}
        </Button>
      </form>
    </Box>
  );
};
