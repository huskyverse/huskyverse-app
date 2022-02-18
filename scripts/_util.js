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

const usdcMintSecret = Uint8Array.from([236, 45, 3, 28, 154, 71, 50, 4, 39, 20, 15, 67, 152, 28, 67, 56, 41, 47, 128, 54, 216, 63, 135, 85, 5, 210, 243, 164, 106, 57, 147, 131, 65, 181, 238, 240, 44, 75, 200, 20, 200, 48, 106, 209, 213, 27, 203, 150, 173, 100, 44, 186, 169, 171, 58, 6, 204, 237, 65, 14, 223, 89, 92, 117])
const hkvMintSecret = Uint8Array.from([6, 252, 191, 72, 79, 147, 150, 210, 70, 58, 13, 219, 141, 187, 30, 232, 100, 79, 10, 41, 195, 135, 104, 188, 175, 158, 142, 194, 39, 180, 217, 56, 255, 1, 255, 92, 82, 212, 24, 158, 43, 22, 185, 37, 121, 188, 117, 118, 189, 181, 225, 219, 21, 31, 74, 76, 74, 52, 126, 7, 97, 157, 48, 8])

const mockUsdcMint = anchor.web3.Keypair.fromSecretKey(
  usdcMintSecret
);

const mockHkvMint = anchor.web3.Keypair.fromSecretKey(
  hkvMintSecret
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
