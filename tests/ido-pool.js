const anchor = require("@project-serum/anchor");
const assert = require("assert");

const {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  Token,
} = require("@solana/spl-token");
const {
  sleep,
  getTokenAccount,
  createMint,
  createTokenAccount,
} = require("./utils");
const createIdoPool = require("../sdk/ido-pool");

describe("ido-pool", () => {
  const provider = anchor.Provider.local();

  // Configure the client to use the local cluster.
  anchor.setProvider(provider);

  const program = anchor.workspace.IdoPool;

  const idoName = "test_ido";
  const idoPool = createIdoPool(provider, program, idoName);

  // All mints default to 6 decimal places.
  const huskyverseIdoAmount = new anchor.BN(5000000);

  // These are all of the variables we assume exist in the world already and
  // are available to the client.
  let deps = {
    usdcMintAccount: null,
    usdcMint: null,
    huskyverseMintAccount: null,
    huskyverseMint: null,
    idoAuthorityUsdc: null,
    idoAuthorityHuskyverse: null,
  };

  it("Initializes the state-of-the-world", async () => {
    deps.usdcMintAccount = await createMint(provider);
    deps.huskyverseMintAccount = await createMint(provider, undefined, 8);
    deps.usdcMint = deps.usdcMintAccount.publicKey;
    deps.huskyverseMint = deps.huskyverseMintAccount.publicKey;
    deps.idoAuthorityUsdc = await createTokenAccount(
      provider,
      deps.usdcMint,
      provider.wallet.publicKey
    );
    deps.idoAuthorityHuskyverse = await createTokenAccount(
      provider,
      deps.huskyverseMint,
      provider.wallet.publicKey
    );
    // Mint Huskyverse tokens that will be distributed from the IDO pool.
    await deps.huskyverseMintAccount.mintTo(
      deps.idoAuthorityHuskyverse,
      provider.wallet.publicKey,
      [],
      huskyverseIdoAmount.toString()
    );
    idoAuthority_huskyverse_account = await getTokenAccount(
      provider,
      deps.idoAuthorityHuskyverse
    );
    assert.ok(idoAuthority_huskyverse_account.amount.eq(huskyverseIdoAmount));
  });

  // These are all variables the client will need to create in order to
  // initialize the IDO pool
  let idoTimes;

  it("Initializes the IDO pool", async () => {
    idoTimes = new IdoTimes();
    const nowBn = new anchor.BN(Date.now() / 1000);
    idoTimes.startIdo = nowBn.add(new anchor.BN(5));
    idoTimes.endDeposits = nowBn.add(new anchor.BN(10));
    idoTimes.endIdo = nowBn.add(new anchor.BN(15));
    idoTimes.endEscrow = nowBn.add(new anchor.BN(16));

    await idoPool.initializePool(deps, idoTimes, huskyverseIdoAmount);

    const idoAuthorityHuskyverseAccount = await getTokenAccount(
      provider,
      deps.idoAuthorityHuskyverse
    );
    assert.ok(idoAuthorityHuskyverseAccount.amount.eq(new anchor.BN(0)));
  });

  // We're going to need to start using the associated program account for creating token accounts
  // if not in testing, then definitely in production.

  let userUsdc = null;
  // 10 usdc
  const firstDeposit = new anchor.BN(10_000_349);

  it("Exchanges user USDC for redeemable tokens", async () => {
    const usdcMint = deps.usdcMint;
    // Wait until the IDO has opened.
    if (Date.now() < idoTimes.startIdo.toNumber() * 1000) {
      await sleep(idoTimes.startIdo.toNumber() * 1000 - Date.now() + 2000);
    }

    // Prep USDC token account and amounts for testing
    userUsdc = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      usdcMint,
      program.provider.wallet.publicKey
    );
    // Get the instructions to add to the RPC call
    let createUserUsdcInstr = Token.createAssociatedTokenAccountInstruction(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      usdcMint,
      userUsdc,
      program.provider.wallet.publicKey,
      program.provider.wallet.publicKey
    );
    let createUserUsdcTrns = new anchor.web3.Transaction().add(
      createUserUsdcInstr
    );
    await provider.send(createUserUsdcTrns);
    await deps.usdcMintAccount.mintTo(
      userUsdc,
      provider.wallet.publicKey,
      [],
      firstDeposit.toString()
    );

    // Check if we inited correctly
    userUsdcAccount = await getTokenAccount(provider, userUsdc);
    assert.ok(userUsdcAccount.amount.eq(firstDeposit));

    try {
      await idoPool.exchangeUsdcForRedeemable(
        deps,
        provider.wallet.publicKey,
        userUsdc,
        firstDeposit
      );
    } catch (err) {
      console.log("This is the error message:", err.toString());
    }

    const [poolUsdc] = await idoPool.accounts.poolUsdc();
    const [userRedeemable] = await idoPool.accounts.userRedeemable(
      provider.wallet.publicKey
    );

    // usdc pool and user redeemable must match
    poolUsdcAccount = await getTokenAccount(provider, poolUsdc);
    assert.ok(poolUsdcAccount.amount.eq(firstDeposit));

    userRedeemableAccount = await getTokenAccount(provider, userRedeemable);
    assert.ok(userRedeemableAccount.amount.eq(firstDeposit));
  });

  // 23 usdc
  const secondDeposit = new anchor.BN(23_000_672);
  let totalPoolUsdc, secondUserKeypair, secondUserUsdc;

  it("Exchanges a second users USDC for redeemable tokens", async () => {
    const usdcMint = deps.usdcMint;

    const [poolUsdc] = await idoPool.accounts.poolUsdc();

    secondUserKeypair = anchor.web3.Keypair.generate();

    transferSolInstr = anchor.web3.SystemProgram.transfer({
      fromPubkey: provider.wallet.publicKey,
      lamports: 100_000_000_000, // 100 sol
      toPubkey: secondUserKeypair.publicKey,
    });
    secondUserUsdc = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      usdcMint,
      secondUserKeypair.publicKey
    );
    createSecondUserUsdcInstr = Token.createAssociatedTokenAccountInstruction(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      usdcMint,
      secondUserUsdc,
      secondUserKeypair.publicKey,
      provider.wallet.publicKey
    );
    let createSecondUserUsdcTrns = new anchor.web3.Transaction();
    createSecondUserUsdcTrns.add(transferSolInstr);
    createSecondUserUsdcTrns.add(createSecondUserUsdcInstr);
    await provider.send(createSecondUserUsdcTrns);
    await deps.usdcMintAccount.mintTo(
      secondUserUsdc,
      provider.wallet.publicKey,
      [],
      secondDeposit.toString()
    );

    // Checking the transfer went through
    secondUserUsdcAccount = await getTokenAccount(provider, secondUserUsdc);
    assert.ok(secondUserUsdcAccount.amount.eq(secondDeposit));

    const [secondUserRedeemable] = await idoPool.accounts.userRedeemable(
      secondUserKeypair.publicKey
    );

    try {
      await idoPool.exchangeUsdcForRedeemable(
        deps,
        secondUserKeypair.publicKey,
        secondUserUsdc,
        secondDeposit,
        [secondUserKeypair]
      );
    } catch (err) {
      console.log("This is the error message:", err.toString());
    }

    secondUserRedeemableAccount = await getTokenAccount(
      provider,
      secondUserRedeemable
    );
    assert.ok(secondUserRedeemableAccount.amount.eq(secondDeposit));

    totalPoolUsdc = firstDeposit.add(secondDeposit);
    poolUsdcAccount = await getTokenAccount(provider, poolUsdc);
    assert.ok(poolUsdcAccount.amount.eq(totalPoolUsdc));
  });

  const firstWithdrawal = new anchor.BN(2_000_000);

  it("Exchanges user Redeemable tokens for USDC", async () => {
    await idoPool.exchangeRedeemableForUsdc(
      deps,
      provider.wallet.publicKey,
      firstWithdrawal
    );

    const [poolUsdc] = await idoPool.accounts.poolUsdc();
    const [escrowUsdc] = await idoPool.accounts.escrowUsdc(
      provider.wallet.publicKey
    );

    totalPoolUsdc = totalPoolUsdc.sub(firstWithdrawal);
    poolUsdcAccount = await getTokenAccount(provider, poolUsdc);
    assert.ok(poolUsdcAccount.amount.eq(totalPoolUsdc));
    escrowUsdcAccount = await getTokenAccount(provider, escrowUsdc);
    assert.ok(escrowUsdcAccount.amount.eq(firstWithdrawal));
  });

  it("Exchanges user Redeemable tokens for huskyverse", async () => {
    const huskyverseMint = deps.huskyverseMint;
    // Wait until the IDO has ended.
    if (Date.now() < idoTimes.endIdo.toNumber() * 1000) {
      await sleep(idoTimes.endIdo.toNumber() * 1000 - Date.now() + 3000);
    }

    const [poolHuskyverse] = await idoPool.accounts.poolHuskyverse();

    let firstUserRedeemable = firstDeposit.sub(firstWithdrawal);
    // TODO we've been lazy here and not used an ATA as we did with USDC
    const userHuskyverse = await createTokenAccount(
      provider,
      huskyverseMint,
      provider.wallet.publicKey
    );

    await idoPool.exchangeRedeemableForHuskyverse(
      deps,
      userHuskyverse,
      provider.wallet.publicKey,
      firstUserRedeemable
    );

    const poolHuskyverseAccount = await getTokenAccount(
      provider,
      poolHuskyverse
    );
    const redeemedHuskyverse = firstUserRedeemable
      .mul(huskyverseIdoAmount)
      .div(totalPoolUsdc);

    const remainingHuskyverse = huskyverseIdoAmount.sub(redeemedHuskyverse);
    assert.ok(poolHuskyverseAccount.amount.eq(remainingHuskyverse));

    const userHuskyverseAccount = await getTokenAccount(
      provider,
      userHuskyverse
    );
    assert.ok(userHuskyverseAccount.amount.eq(redeemedHuskyverse));
  });

  it("Exchanges second user's Redeemable tokens for huskyverse", async () => {
    const huskyverseMint = deps.huskyverseMint;

    const [poolHuskyverse] = await idoPool.accounts.poolHuskyverse();

    const secondUserHuskyverse = await createTokenAccount(
      provider,
      huskyverseMint,
      secondUserKeypair.publicKey
    );

    await idoPool.exchangeRedeemableForHuskyverse(
      deps,
      secondUserHuskyverse,
      secondUserKeypair.publicKey,
      secondDeposit,
      [secondUserKeypair]
    );

    const poolHuskyverseAccount = await getTokenAccount(
      provider,
      poolHuskyverse
    );
    assert.ok(poolHuskyverseAccount.amount.eq(new anchor.BN(0)));
  });

  it("Withdraws total USDC from pool account", async () => {
    const usdcMint = deps.usdcMint;
    const huskyverseMint = deps.huskyverseMint;
    const idoAuthorityUsdc = deps.idoAuthorityUsdc;

    const [idoAccount] = await idoPool.accounts.ido();
    const [poolUsdc] = await idoPool.accounts.poolUsdc();

    await program.rpc.withdrawPoolUsdc({
      accounts: {
        idoAuthority: provider.wallet.publicKey,
        idoAuthorityUsdc,
        idoAccount,
        usdcMint,
        huskyverseMint,
        poolUsdc,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    });

    poolUsdcAccount = await getTokenAccount(provider, poolUsdc);
    assert.ok(poolUsdcAccount.amount.eq(new anchor.BN(0)));
    idoAuthorityUsdcAccount = await getTokenAccount(provider, idoAuthorityUsdc);
    assert.ok(idoAuthorityUsdcAccount.amount.eq(totalPoolUsdc));
  });

  it("Withdraws USDC from the escrow account after waiting period is over", async () => {
    const usdcMint = deps.usdcMint;
    // Wait until the escrow period is over.
    if (Date.now() < idoTimes.endEscrow.toNumber() * 1000 + 1000) {
      await sleep(idoTimes.endEscrow.toNumber() * 1000 - Date.now() + 4000);
    }

    const [idoAccount] = await idoPool.accounts.ido();
    const [escrowUsdc] = await idoPool.accounts.escrowUsdc(
      provider.wallet.publicKey
    );

    await program.rpc.withdrawFromEscrow(firstWithdrawal, {
      accounts: {
        payer: provider.wallet.publicKey,
        userAuthority: provider.wallet.publicKey,
        userUsdc,
        escrowUsdc,
        idoAccount,
        usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    });

    const userUsdcAccount = await getTokenAccount(provider, userUsdc);
    assert.ok(userUsdcAccount.amount.eq(firstWithdrawal));
  });

  function IdoTimes() {
    this.startIdo;
    this.endDeposts;
    this.endIdo;
    this.endEscrow;
  }
});
