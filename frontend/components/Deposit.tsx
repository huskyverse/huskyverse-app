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
} from "@chakra-ui/react";

import { useForm } from "react-hook-form";

import { usePhaseInfo } from "../hooks/usePhaseInfo";

import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { useIdoPool } from "../hooks/useIdoPool";
import { useTokenBalance } from "../hooks/userTokenBalance";
import { getATA, mintPubkey, toBN, tokenDecimals } from "../lib/token";
import { BN } from "@project-serum/anchor";

// TODO:
// - better validation logic
// - constants extraction

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
    <Container>
      <p>
        USDC:{" "}
        {usdc.error
          ? JSON.stringify(usdc.error)
          : usdc.data
          ? usdc.data.uiAmountString
          : "..."}
      </p>
      <p>
        Contribution:{" "}
        {redeemable.error
          ? JSON.stringify(redeemable.error)
          : redeemable.data
          ? redeemable.data.uiAmountString
          : "..."}
      </p>
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
                  // TODO: better validation
                  required: "deposit amount can't be blank",
                  pattern: {
                    value: /^(\d+)\.?(\d{0,6})$/, // to be extracted
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
