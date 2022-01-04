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
const { token } = require("@project-serum/anchor/dist/cjs/utils");

describe("ido-pool", () => {
  const provider = anchor.Provider.local();

  // Configure the client to use the local cluster.
  anchor.setProvider(provider);

  const program = anchor.workspace.IdoPool;

  const idoPool = require("../sdk/ido-pool")(provider, program);

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
    deps.huskyverseMintAccount = await createMint(provider);
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
  let idoName = "test_ido";

  it("Initializes the IDO pool", async () => {
    idoTimes = new IdoTimes();
    const nowBn = new anchor.BN(Date.now() / 1000);
    idoTimes.startIdo = nowBn.add(new anchor.BN(5));
    idoTimes.endDeposits = nowBn.add(new anchor.BN(10));
    idoTimes.endIdo = nowBn.add(new anchor.BN(15));
    idoTimes.endEscrow = nowBn.add(new anchor.BN(16));

    try {
      await idoPool.initializePool(
        deps,
        idoName,
        idoTimes,
        huskyverseIdoAmount
      );
    } catch (e) {
      console.log("ERRRRR:", e);
    }

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
    const huskyverseMint = deps.huskyverseMint;
    // Wait until the IDO has opened.
    if (Date.now() < idoTimes.startIdo.toNumber() * 1000) {
      await sleep(idoTimes.startIdo.toNumber() * 1000 - Date.now() + 2000);
    }

    const [idoAccount] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(idoName)],
      program.programId
    );

    const [redeemableMint] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(idoName), Buffer.from("redeemable_mint")],
      program.programId
    );

    const [poolUsdc] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(idoName), Buffer.from("pool_usdc")],
      program.programId
    );

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

    const [userRedeemable] = await anchor.web3.PublicKey.findProgramAddress(
      [
        provider.wallet.publicKey.toBuffer(),
        Buffer.from(idoName),
        Buffer.from("user_redeemable"),
      ],
      program.programId
    );

    try {
      const tx = await program.rpc.exchangeUsdcForRedeemable(firstDeposit, {
        accounts: {
          userAuthority: provider.wallet.publicKey,
          userUsdc,
          userRedeemable,
          idoAccount,
          usdcMint,
          redeemableMint,
          huskyverseMint,
          poolUsdc,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
        instructions: [
          program.instruction.initUserRedeemable({
            accounts: {
              userAuthority: provider.wallet.publicKey,
              userRedeemable,
              idoAccount,
              redeemableMint,
              systemProgram: anchor.web3.SystemProgram.programId,
              tokenProgram: TOKEN_PROGRAM_ID,
              rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            },
          }),
        ],
      });
    } catch (err) {
      console.log("This is the error message", err.toString());
    }

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
    const huskyverseMint = deps.huskyverseMint;
    const [idoAccount] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(idoName)],
      program.programId
    );

    const [redeemableMint] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(idoName), Buffer.from("redeemable_mint")],
      program.programId
    );

    const [poolUsdc] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(idoName), Buffer.from("pool_usdc")],
      program.programId
    );

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

    const [secondUserRedeemable] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          secondUserKeypair.publicKey.toBuffer(),
          Buffer.from(idoName),
          Buffer.from("user_redeemable"),
        ],
        program.programId
      );

    await program.rpc.exchangeUsdcForRedeemable(secondDeposit, {
      accounts: {
        userAuthority: secondUserKeypair.publicKey,
        userUsdc: secondUserUsdc,
        userRedeemable: secondUserRedeemable,
        idoAccount,
        usdcMint,
        redeemableMint,
        huskyverseMint,
        poolUsdc,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
      instructions: [
        program.instruction.initUserRedeemable({
          accounts: {
            userAuthority: secondUserKeypair.publicKey,
            userRedeemable: secondUserRedeemable,
            idoAccount,
            redeemableMint,
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          },
        }),
      ],
      signers: [secondUserKeypair],
    });

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
    const usdcMint = deps.usdcMint;
    const huskyverseMint = deps.huskyverseMint;
    const [idoAccount] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(idoName)],
      program.programId
    );

    const [redeemableMint] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(idoName), Buffer.from("redeemable_mint")],
      program.programId
    );

    const [poolUsdc] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(idoName), Buffer.from("pool_usdc")],
      program.programId
    );

    const [userRedeemable] = await anchor.web3.PublicKey.findProgramAddress(
      [
        provider.wallet.publicKey.toBuffer(),
        Buffer.from(idoName),
        Buffer.from("user_redeemable"),
      ],
      program.programId
    );

    const [escrowUsdc] = await anchor.web3.PublicKey.findProgramAddress(
      [
        provider.wallet.publicKey.toBuffer(),
        Buffer.from(idoName),
        Buffer.from("escrow_usdc"),
      ],
      program.programId
    );

    await program.rpc.exchangeRedeemableForUsdc(firstWithdrawal, {
      accounts: {
        userAuthority: provider.wallet.publicKey,
        escrowUsdc,
        userRedeemable,
        idoAccount,
        usdcMint,
        redeemableMint,
        huskyverseMint,
        poolUsdc,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
      instructions: [
        program.instruction.initEscrowUsdc({
          accounts: {
            userAuthority: provider.wallet.publicKey,
            escrowUsdc,
            idoAccount,
            usdcMint,
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          },
        }),
      ],
    });

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

    const [idoAccount] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(idoName)],
      program.programId
    );

    const [poolHuskyverse] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(idoName), Buffer.from("pool_huskyverse")],
      program.programId
    );

    const [redeemableMint] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(idoName), Buffer.from("redeemable_mint")],
      program.programId
    );

    const [userRedeemable] = await anchor.web3.PublicKey.findProgramAddress(
      [
        provider.wallet.publicKey.toBuffer(),
        Buffer.from(idoName),
        Buffer.from("user_redeemable"),
      ],
      program.programId
    );

    let firstUserRedeemable = firstDeposit.sub(firstWithdrawal);
    // TODO we've been lazy here and not used an ATA as we did with USDC
    userHuskyverse = await createTokenAccount(
      provider,
      huskyverseMint,
      provider.wallet.publicKey
    );

    await program.rpc.exchangeRedeemableForHuskyverse(firstUserRedeemable, {
      accounts: {
        payer: provider.wallet.publicKey,
        userAuthority: provider.wallet.publicKey,
        userHuskyverse,
        userRedeemable,
        idoAccount,
        huskyverseMint,
        redeemableMint,
        poolHuskyverse,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    });

    poolHuskyverseAccount = await getTokenAccount(provider, poolHuskyverse);
    let redeemedHuskyverse = firstUserRedeemable
      .mul(huskyverseIdoAmount)
      .div(totalPoolUsdc);
    let remainingHuskyverse = huskyverseIdoAmount.sub(redeemedHuskyverse);
    assert.ok(poolHuskyverseAccount.amount.eq(remainingHuskyverse));
    userHuskyverseAccount = await getTokenAccount(provider, userHuskyverse);
    assert.ok(userHuskyverseAccount.amount.eq(redeemedHuskyverse));
  });

  it("Exchanges second user's Redeemable tokens for huskyverse", async () => {
    const huskyverseMint = deps.huskyverseMint;
    const [idoAccount] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(idoName)],
      program.programId
    );

    const [redeemableMint] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(idoName), Buffer.from("redeemable_mint")],
      program.programId
    );

    const [secondUserRedeemable] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          secondUserKeypair.publicKey.toBuffer(),
          Buffer.from(idoName),
          Buffer.from("user_redeemable"),
        ],
        program.programId
      );

    const [poolHuskyverse] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(idoName), Buffer.from("pool_huskyverse")],
      program.programId
    );

    secondUserHuskyverse = await createTokenAccount(
      provider,
      huskyverseMint,
      secondUserKeypair.publicKey
    );

    await program.rpc.exchangeRedeemableForHuskyverse(secondDeposit, {
      accounts: {
        payer: provider.wallet.publicKey,
        userAuthority: secondUserKeypair.publicKey,
        userHuskyverse: secondUserHuskyverse,
        userRedeemable: secondUserRedeemable,
        idoAccount,
        huskyverseMint,
        redeemableMint,
        poolHuskyverse,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    });

    poolHuskyverseAccount = await getTokenAccount(provider, poolHuskyverse);
    assert.ok(poolHuskyverseAccount.amount.eq(new anchor.BN(0)));
  });

  it("Withdraws total USDC from pool account", async () => {
    const usdcMint = deps.usdcMint;
    const huskyverseMint = deps.huskyverseMint;
    const idoAuthorityUsdc = deps.idoAuthorityUsdc;

    const [idoAccount] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(idoName)],
      program.programId
    );

    const [poolUsdc] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(idoName), Buffer.from("pool_usdc")],
      program.programId
    );

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

    const [idoAccount] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(idoName)],
      program.programId
    );

    const [escrowUsdc] = await anchor.web3.PublicKey.findProgramAddress(
      [
        provider.wallet.publicKey.toBuffer(),
        Buffer.from(idoName),
        Buffer.from("escrow_usdc"),
      ],
      program.programId
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

    userUsdcAccount = await getTokenAccount(provider, userUsdc);
    assert.ok(userUsdcAccount.amount.eq(firstWithdrawal));
  });

  function PoolBumps() {
    this.idoAccount;
    this.redeemableMint;
    this.poolHuskyverse;
    this.poolUsdc;
  }

  function IdoTimes() {
    this.startIdo;
    this.endDeposts;
    this.endIdo;
    this.endEscrow;
  }
});
