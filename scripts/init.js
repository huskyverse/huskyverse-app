#!/usr/bin/env node

const anchor = require("@project-serum/anchor");
const createIdoPool = require("../sdk/ido-pool");
const { createMint, createTokenAccount } = require("../tests/utils");

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
  const usdcMintAccount = await createMint(provider);
  const huskyverseMintAccount = await createMint(provider, undefined, 8);
  const usdcMint = usdcMintAccount.publicKey;
  const huskyverseMint = huskyverseMintAccount.publicKey;
  const huskyverseIdoAmount = new anchor.BN(5_000_000);

  const idoAuthorityHuskyverse = await createTokenAccount(
    provider,
    huskyverseMint,
    provider.wallet.publicKey
  );
  // Mint Huskyverse tokens that will be distributed from the IDO pool.
  await huskyverseMintAccount.mintTo(
    idoAuthorityHuskyverse,
    provider.wallet.publicKey,
    [],
    huskyverseIdoAmount.toString()
  );

  const idoTimes = new IdoTimes();
  const nowBn = new anchor.BN(Date.now() / 1000);
  idoTimes.startIdo = nowBn.add(new anchor.BN(100));
  idoTimes.endDeposits = nowBn.add(new anchor.BN(200));
  idoTimes.endIdo = nowBn.add(new anchor.BN(300));
  idoTimes.endEscrow = nowBn.add(new anchor.BN(400));

  const deps = { usdcMint, huskyverseMint, idoAuthorityHuskyverse };

  await idoPool.initializePool(deps, idoTimes, huskyverseIdoAmount);
};

main();
