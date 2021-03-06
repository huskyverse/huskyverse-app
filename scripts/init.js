#!/usr/bin/env node

const anchor = require("@project-serum/anchor");
const spl = require("@solana/spl-token");
const createIdoPool = require("../sdk/ido-pool");
const { createTokenAccount } = require("../tests/utils");
const { configEnv, createMint, mockUsdcMint, mockHkvMint } = require("./_util");
const { PublicKey } = anchor.web3;

function IdoTimes() {
  this.startIdo;
  this.endDeposts;
  this.endIdo;
  this.endEscrow;
}

const main = async () => {
  configEnv();
  const provider = anchor.Provider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.IdoPool;

  const idoName = "huskyverse";
  const idoPool = createIdoPool(provider, program, idoName);

  let USDCToken, HKVToken;
  let depositDurationInMinutes = 10,
    linearWithdrawDurationInMinutes = 60;
  // only dev
  if (process.env.ENV === "local") {
    USDCToken = await createMint(provider, mockUsdcMint, 6);
    HKVToken = await createMint(provider, mockHkvMint, 8);
    depositDurationInMinutes = 10;
    linearWithdrawDurationInMinutes = 2;
  } else if (process.env.ENV === "dev") {
    USDCToken = new spl.Token(
      provider.connection,
      new PublicKey("5RWQP9Be7p17mf7X6fZcBJQipqASdXGdTJ6MBX79zcNY"),
      spl.TOKEN_PROGRAM_ID,
      provider.wallet.payer
    );

    HKVToken = new spl.Token(
      provider.connection,
      new PublicKey("JASjK99SHU78o3QE9jKWCwhMoTydiHX4BVNYd7peeHkK"),
      spl.TOKEN_PROGRAM_ID,
      provider.wallet.payer
    );
  } else {
    // mainnet
    USDCToken = new spl.Token(
      provider.connection,
      new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
      spl.TOKEN_PROGRAM_ID,
      provider.wallet.payer
    );

    HKVToken = new spl.Token(
      provider.connection,
      new PublicKey("23f5TH1tFkfX6jPVQNy4VQ66Fo32WUc8zrZT1c14LzBM"),
      spl.TOKEN_PROGRAM_ID,
      provider.wallet.payer
    );
  }

  const usdcMint = USDCToken.publicKey;
  const huskyverseMint = HKVToken.publicKey;
  const huskyverseIdoAmount = new anchor.BN(process.env.HKV_POOL_AMOUNT);

  const idoAuthorityHuskyverse = await createTokenAccount(
    provider,
    huskyverseMint,
    provider.wallet.publicKey
  );
  // Mint Huskyverse tokens that will be distributed from the IDO pool.
  await HKVToken.mintTo(
    idoAuthorityHuskyverse,
    provider.wallet.publicKey,
    [],
    huskyverseIdoAmount.toString()
  );

  const idoTimes = new IdoTimes();
  const nowBn = new anchor.BN(Date.now() / 1000);
  idoTimes.startIdo = nowBn.add(new anchor.BN(10));
  idoTimes.endDeposits = nowBn.add(
    new anchor.BN(60 * depositDurationInMinutes)
  );
  idoTimes.endIdo = nowBn.add(
    new anchor.BN(
      60 * (depositDurationInMinutes + linearWithdrawDurationInMinutes)
    )
  );

  const deps = { usdcMint, huskyverseMint, idoAuthorityHuskyverse };

  await idoPool.initializePool(deps, idoTimes, huskyverseIdoAmount);
};

main();
