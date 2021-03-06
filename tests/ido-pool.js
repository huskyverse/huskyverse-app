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
  let publicIdoTimes;

  it("Initializes the IDO pool", async () => {
    publicIdoTimes = new IdoTimes();
    const nowBn = new anchor.BN(Date.now() / 1000);
    publicIdoTimes.startIdo = nowBn.add(new anchor.BN(5));
    publicIdoTimes.endDeposits = nowBn.add(new anchor.BN(12));
    publicIdoTimes.endIdo = nowBn.add(new anchor.BN(17));
    publicIdoTimes.endEscrow = nowBn.add(new anchor.BN(18));

    console.log("ido starts: ", publicIdoTimes.startIdo.toNumber() * 1000);
    console.log("deposit ends: ", publicIdoTimes.endDeposits.toNumber() * 1000);
    console.log("ido ends: ", publicIdoTimes.endIdo.toNumber() * 1000);

    await idoPool.initializePool(deps, publicIdoTimes, huskyverseIdoAmount);

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
    if (Date.now() < publicIdoTimes.startIdo.toNumber() * 1000) {
      await sleep(publicIdoTimes.startIdo.toNumber() * 1000 - Date.now() + 2000);
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

    const [publicPoolUsdc] = await idoPool.accounts.publicPoolUsdc();
    const [userRedeemable] = await idoPool.accounts.userRedeemable(
      provider.wallet.publicKey
    );

    // usdc pool and user redeemable must match
    publicPoolUsdcAccount = await getTokenAccount(provider, publicPoolUsdc);
    assert.ok(publicPoolUsdcAccount.amount.eq(firstDeposit));

    userRedeemableAccount = await getTokenAccount(provider, userRedeemable);
    assert.ok(userRedeemableAccount.amount.eq(firstDeposit));
  });

  // 23 usdc
  const secondDeposit = new anchor.BN(23_000_672);
  let totalPoolUsdc, secondUserKeypair, secondUserUsdc;

  it("Exchanges a second users USDC for redeemable tokens", async () => {
    const usdcMint = deps.usdcMint;

    const [publicPoolUsdc] = await idoPool.accounts.publicPoolUsdc();

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
    publicPoolUsdcAccount = await getTokenAccount(provider, publicPoolUsdc);
    assert.ok(publicPoolUsdcAccount.amount.eq(totalPoolUsdc));
  });

  let firstUserTotalWithdraw = new anchor.BN(2_000_000);

  it("has no amount limit during unrestricted phase", async () => {
    // first withdraw
    const fullWithdrawal = firstDeposit
    prevUserUsdcAmount = (await getTokenAccount(provider, userUsdc)).amount;
    await idoPool.exchangeRedeemableForUsdc(
      deps,
      provider.wallet.publicKey,
      userUsdc,
      fullWithdrawal
    );

    const [publicPoolUsdc] = await idoPool.accounts.publicPoolUsdc();

    totalPoolUsdc = totalPoolUsdc.sub(fullWithdrawal);
    publicPoolUsdcAccount = await getTokenAccount(provider, publicPoolUsdc);
    assert.ok(publicPoolUsdcAccount.amount.eq(totalPoolUsdc));

    currUserUsdcAmount = (await getTokenAccount(provider, userUsdc)).amount;

    assert.ok(currUserUsdcAmount.sub(prevUserUsdcAmount).eq(fullWithdrawal));

    // re-deposit
    await idoPool.exchangeUsdcForRedeemable(
      deps,
      provider.wallet.publicKey,
      userUsdc,
      firstDeposit
    );
    totalPoolUsdc = totalPoolUsdc.add(firstDeposit)
  });

  it("can withdraw multiple times during unrestricted phase", async () => {
    // second withdraw
    const secondWithdrawal = firstUserTotalWithdraw;

    prevUserUsdcAmount = (await getTokenAccount(provider, userUsdc)).amount;
    await idoPool.exchangeRedeemableForUsdc(
      deps,
      provider.wallet.publicKey,
      userUsdc,
      secondWithdrawal
    );

    const [publicPoolUsdc] = await idoPool.accounts.publicPoolUsdc();

    totalPoolUsdc = totalPoolUsdc.sub(secondWithdrawal);
    publicPoolUsdcAccount = await getTokenAccount(provider, publicPoolUsdc);
    assert.ok(publicPoolUsdcAccount.amount.eq(totalPoolUsdc));

    currUserUsdcAmount = (await getTokenAccount(provider, userUsdc)).amount;

    assert.ok(currUserUsdcAmount.sub(prevUserUsdcAmount).eq(secondWithdrawal));
  })

  it("Can withdraw only once during linear decrease withdraw phase", async () => {
    const withdrawAmount = new anchor.BN(100_000);

    prevUserUsdcAmount = (await getTokenAccount(provider, userUsdc)).amount;

    // Wait until the IDO has opened.
    if (Date.now() < publicIdoTimes.endDeposits.toNumber() * 1000) {
      await sleep(publicIdoTimes.endDeposits.toNumber() * 1000 - Date.now() + 2000);
    }

    await idoPool.exchangeRedeemableForUsdc(
      deps,
      provider.wallet.publicKey,
      userUsdc,
      withdrawAmount
    );

    const [publicPoolUsdc] = await idoPool.accounts.publicPoolUsdc();

    totalPoolUsdc = totalPoolUsdc.sub(withdrawAmount);
    publicPoolUsdcAccount = await getTokenAccount(provider, publicPoolUsdc);
    assert.ok(publicPoolUsdcAccount.amount.eq(totalPoolUsdc));

    currUserUsdcAmount = (await getTokenAccount(provider, userUsdc)).amount;

    assert.ok(currUserUsdcAmount.sub(prevUserUsdcAmount).eq(withdrawAmount));

    firstUserTotalWithdraw = firstUserTotalWithdraw.add(withdrawAmount);

    try {
      await idoPool.exchangeRedeemableForUsdc(
        deps,
        provider.wallet.publicKey,
        userUsdc,
        withdrawAmount
      );
    } catch (err) {
      assert.ok(err.msg === "Exceed withdraw limit during linear decrease withdraw phase")
    }
  })

  it("Exchanges user Redeemable tokens for huskyverse", async () => {
    const huskyverseMint = deps.huskyverseMint;
    // Wait until the IDO has ended.
    if (Date.now() < publicIdoTimes.endIdo.toNumber() * 1000) {
      await sleep(publicIdoTimes.endIdo.toNumber() * 1000 - Date.now() + 2000);
    }

    const [publicPoolHuskyverse] = await idoPool.accounts.publicPoolHuskyverse();

    let firstUserRedeemable = firstDeposit.sub(firstUserTotalWithdraw);
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

    const publicPoolHuskyverseAccount = await getTokenAccount(
      provider,
      publicPoolHuskyverse
    );
    const redeemedHuskyverse = firstUserRedeemable
      .mul(huskyverseIdoAmount)
      .div(totalPoolUsdc);

    const remainingHuskyverse = huskyverseIdoAmount.sub(redeemedHuskyverse);
    assert.ok(publicPoolHuskyverseAccount.amount.eq(remainingHuskyverse));

    const userHuskyverseAccount = await getTokenAccount(
      provider,
      userHuskyverse
    );
    assert.ok(userHuskyverseAccount.amount.eq(redeemedHuskyverse));
  });

  it("Exchanges second user's Redeemable tokens for huskyverse", async () => {
    const huskyverseMint = deps.huskyverseMint;

    const [publicPoolHuskyverse] = await idoPool.accounts.publicPoolHuskyverse();

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

    const publicPoolHuskyverseAccount = await getTokenAccount(
      provider,
      publicPoolHuskyverse
    );
    assert.ok(publicPoolHuskyverseAccount.amount.eq(new anchor.BN(0)));
  });

  it("Withdraws total USDC from pool account", async () => {
    const usdcMint = deps.usdcMint;
    const huskyverseMint = deps.huskyverseMint;
    const idoAuthorityUsdc = deps.idoAuthorityUsdc;

    const [idoAccount] = await idoPool.accounts.ido();
    const [publicPoolUsdc] = await idoPool.accounts.publicPoolUsdc();

    await program.rpc.withdrawPublicPoolUsdc({
      accounts: {
        idoAuthority: provider.wallet.publicKey,
        idoAuthorityUsdc,
        idoAccount,
        usdcMint,
        huskyverseMint,
        publicPoolUsdc,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    });

    publicPoolUsdcAccount = await getTokenAccount(provider, publicPoolUsdc);
    assert.ok(publicPoolUsdcAccount.amount.eq(new anchor.BN(0)));
    idoAuthorityUsdcAccount = await getTokenAccount(provider, idoAuthorityUsdc);
    assert.ok(idoAuthorityUsdcAccount.amount.eq(totalPoolUsdc));
  });

  function IdoTimes() {
    this.startIdo;
    this.endDeposts;
    this.endIdo;
  }
});
