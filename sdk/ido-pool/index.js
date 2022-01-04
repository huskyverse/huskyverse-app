const anchor = require("@project-serum/anchor");
const TokenInstructions = require("@project-serum/serum").TokenInstructions;
const TOKEN_PROGRAM_ID = new anchor.web3.PublicKey(
  TokenInstructions.TOKEN_PROGRAM_ID.toString()
);

function PoolBumps() {
  this.idoAccount;
  this.redeemableMint;
  this.poolHuskyverse;
  this.poolUsdc;
}

module.exports = (provider, program) => ({
  initializePool: async (
    { usdcMint, huskyverseMint, idoAuthorityHuskyverse } = _deps,
    idoName,
    idoTimes,
    idoAmount
  ) => {
    let bumps = new PoolBumps();

    const [idoAccount, idoAccountBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(idoName)],
        program.programId
      );
    bumps.idoAccount = idoAccountBump;

    const [redeemableMint, redeemableMintBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(idoName), Buffer.from("redeemable_mint")],
        program.programId
      );
    bumps.redeemableMint = redeemableMintBump;

    const [poolHuskyverse, poolHuskyverseBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(idoName), Buffer.from("pool_huskyverse")],
        program.programId
      );
    bumps.poolHuskyverse = poolHuskyverseBump;

    const [poolUsdc, poolUsdcBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(idoName), Buffer.from("pool_usdc")],
        program.programId
      );
    bumps.poolUsdc = poolUsdcBump;

    return await program.rpc.initializePool(
      idoName,
      bumps,
      idoAmount,
      idoTimes,
      {
        accounts: {
          idoAuthority: provider.wallet.publicKey,
          idoAuthorityHuskyverse,
          idoAccount,
          huskyverseMint,
          usdcMint,
          redeemableMint,
          poolHuskyverse,
          poolUsdc,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        },
      }
    );
  },
  exchangeUsdcForRedeemable: async (
    { usdcMint, huskyverseMint } = _deps,
    idoName,
    userAuthority,
    userUsdc,
    depositAmount,
    signers // leave blank if use providers
  ) => {
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
        userAuthority.toBuffer(),
        Buffer.from(idoName),
        Buffer.from("user_redeemable"),
      ],
      program.programId
    );

    return await program.rpc.exchangeUsdcForRedeemable(depositAmount, {
      accounts: {
        userAuthority,
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
            userAuthority,
            userRedeemable,
            idoAccount,
            redeemableMint,
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          },
        }),
      ],
      signers,
    });
  },
});
