const anchor = require("@project-serum/anchor");
const spl = require("@solana/spl-token");
const { Transaction, SystemProgram } = anchor.web3;
const path = require("path");

// env: dev | mainnet
const configEnv = () => {
  const env = process.env.ENV ? `.env.${process.env.ENV}` : ".env";
  const _path = path.join(__dirname, "..", env);
  const out = require("dotenv").config({
    path: _path,
  });

  if (out.error) {
    console.error(out.error);
  } else {
    console.log(`environment config from "${env}":`);
    console.table(out.parsed);
  }
};

const mockUsdcMint = anchor.web3.Keypair.fromSecretKey(
  Uint8Array.from([
    118, 130, 112, 243, 90, 70, 160, 3, 104, 239, 158, 140, 42, 184, 112, 247,
    151, 201, 116, 41, 197, 225, 166, 5, 211, 102, 111, 77, 225, 141, 88, 248,
    94, 139, 218, 99, 180, 218, 75, 3, 52, 9, 255, 1, 219, 107, 131, 37, 204,
    160, 46, 117, 2, 105, 1, 139, 106, 174, 200, 134, 22, 8, 91, 240,
  ])
);

const mockHkvMint = anchor.web3.Keypair.fromSecretKey(
  Uint8Array.from([
    214, 8, 162, 101, 34, 121, 77, 108, 150, 89, 233, 171, 215, 146, 208, 146,
    52, 220, 238, 98, 81, 163, 175, 178, 25, 20, 83, 157, 168, 249, 1, 91, 9,
    48, 41, 107, 92, 95, 181, 105, 104, 169, 91, 183, 46, 115, 236, 114, 228,
    230, 249, 218, 220, 34, 242, 155, 107, 44, 8, 30, 173, 221, 8, 82,
  ])
);

const createMint = async (provider, mint, decimals) => {
  try {
    const tx = new Transaction().add(
      // create mint account
      SystemProgram.createAccount({
        fromPubkey: provider.wallet.publicKey,
        newAccountPubkey: mint.publicKey,
        space: spl.MintLayout.span,
        lamports: await spl.Token.getMinBalanceRentForExemptMint(
          provider.connection
        ),
        programId: spl.TOKEN_PROGRAM_ID,
      }),
      // init mint account
      spl.Token.createInitMintInstruction(
        spl.TOKEN_PROGRAM_ID, // always TOKEN_PROGRAM_ID
        mint.publicKey, // mint pubkey
        decimals, // decimals
        provider.wallet.publicKey, // mint authority
        provider.wallet.publicKey // freeze authority (if you don't need it, you can set `null`)
      )
    );
    console.log(`txhash: ${await provider.send(tx, [mint])}`);
  } catch (e) {
    // console.warn(e);
  }

  const token = new spl.Token(
    provider.connection,
    mint.publicKey,
    spl.TOKEN_PROGRAM_ID,
    provider.wallet.payer
  );

  return token;
};

const createATA = async (provider, mintPubkey, userPubkey) => {
  const ata = await spl.Token.getAssociatedTokenAddress(
    spl.ASSOCIATED_TOKEN_PROGRAM_ID, // always ASSOCIATED_TOKEN_PROGRAM_ID
    spl.TOKEN_PROGRAM_ID, // always TOKEN_PROGRAM_ID
    mintPubkey, // mint
    userPubkey // owner
  );
  console.log(`ATA: ${ata.toBase58()}`);

  try {
    let tx = new Transaction().add(
      spl.Token.createAssociatedTokenAccountInstruction(
        spl.ASSOCIATED_TOKEN_PROGRAM_ID, // always ASSOCIATED_TOKEN_PROGRAM_ID
        spl.TOKEN_PROGRAM_ID, // always TOKEN_PROGRAM_ID
        mintPubkey, // mint
        ata, // ata
        userPubkey, // owner of token account
        provider.wallet.publicKey // fee payer
      )
    );
    console.log(`txhash: ${await provider.send(tx)}`);
  } catch (e) {
    // console.warn(e);
  }

  return ata;
};

module.exports = {
  configEnv,
  createMint,
  mockUsdcMint,
  mockHkvMint,
  createATA,
};
