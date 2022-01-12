#!/usr/bin/env node

const anchor = require("@project-serum/anchor");
const createIdoPool = require("../sdk/ido-pool");
const { createTokenAccount } = require("../tests/utils");
const { createMint, mockUsdcMint, mockHkvMint } = require("./_util");

function IdoTimes() {
  this.startIdo;
  this.endDeposts;
  this.endIdo;
  this.endEscrow;
}

const main = async () => {
  // TODO: replace with env
  const provider = anchor.Provider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.IdoPool;

  const idoName = "huskyverse";
  const idoPool = createIdoPool(provider, program, idoName);

  //   const addr = (await idoPool.accounts.ido())[0].toBase58();
  //   console.log(addr);
  //   console.log(await program.account.idoAccount.fetch(addr));

  // only dev
  const USDCToken = await createMint(provider, mockUsdcMint, 6);
  const HKVToken = await createMint(provider, mockHkvMint, 8);

  const usdcMint = USDCToken.publicKey;
  const huskyverseMint = HKVToken.publicKey;
  const huskyverseIdoAmount = new anchor.BN(5_000_000);

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
  idoTimes.startIdo = nowBn.add(new anchor.BN(0));
  idoTimes.endDeposits = nowBn.add(new anchor.BN(60 * 10));
  idoTimes.endIdo = nowBn.add(new anchor.BN(60 * 11));
  idoTimes.endEscrow = nowBn.add(new anchor.BN(60 * 12));

  const deps = { usdcMint, huskyverseMint, idoAuthorityHuskyverse };

  await idoPool.initializePool(deps, idoTimes, huskyverseIdoAmount);
};

main();
