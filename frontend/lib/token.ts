import { BN } from "@project-serum/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";

// TODO: config by env
const mint = {
  usdc: "7N51bsWy9kXmDP89kyPGqUxg576q8CNYf8Gp18HnsRAf",
  hkv: "csGJUUWKYgEw83kgrH9tWQpYcVYETWWQtwvXy1nWtkH",
};

export const tokenDecimals = {
  usdc: 6,
  hkv: 8,
};

export const mintPubkey = (k: "usdc" | "hkv") => new PublicKey(mint[k]);

export const getATA = async (publicKey: PublicKey, token: "usdc" | "hkv") => {
  return await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID, // always ASSOCIATED_TOKEN_PROGRAM_ID
    TOKEN_PROGRAM_ID, // always TOKEN_PROGRAM_ID
    new PublicKey(mint[token]), // mint
    publicKey // owner
  );
};

export const toBN = (s: string, token: "usdc" | "hkv") => {
  const decimals = tokenDecimals[token];
  const [_, w, d] = s.match(/^(\d+)\.?(\d*)$/) || [];

  const maskedD =
    d.length < decimals
      ? d + "0".repeat(decimals - d.length)
      : d.split("").splice(0, decimals).join("");
  return new BN(w + maskedD);
};
