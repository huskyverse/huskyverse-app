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

import { BN } from "@project-serum/anchor";
import { useForm } from "react-hook-form";

import { usePhaseInfo } from "../hooks/usePhaseInfo";

import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { useIdoPool } from "../hooks/useIdoPool";
import { useTokenBalance } from "../hooks/userTokenBalance";

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
            // DEV ONLY
            const usdcMint = new PublicKey(
              "7N51bsWy9kXmDP89kyPGqUxg576q8CNYf8Gp18HnsRAf"
            );
            const huskyverseMint = new PublicKey(
              "csGJUUWKYgEw83kgrH9tWQpYcVYETWWQtwvXy1nWtkH"
            );

            const usdcDecimals = 6;
            const [_, w, d] = v.depositAmount.match(/^(\d+)\.?(\d*)$/) || [];

            const maskedD =
              d.length < usdcDecimals
                ? d + "0".repeat(usdcDecimals - d.length)
                : d.split("").splice(0, usdcDecimals).join("");

            const amount = new BN(w + maskedD);

            const ata = await Token.getAssociatedTokenAddress(
              ASSOCIATED_TOKEN_PROGRAM_ID, // always ASSOCIATED_TOKEN_PROGRAM_ID
              TOKEN_PROGRAM_ID, // always TOKEN_PROGRAM_ID
              usdcMint, // mint
              publicKey // owner
            );

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
                // type="number"
                variant={disabled ? "filled" : "outline"}
                placeholder="USDC amount you want to contribute"
                id="depositAmount"
                {...register("depositAmount", {
                  required: "deposit amount can't be blank",
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
