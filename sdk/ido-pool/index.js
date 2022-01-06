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

module.exports = (provider, program, idoName) => {
  const accounts = {
    ido: () =>
      anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(idoName)],
        program.programId
      ),
    redeemableMint: () =>
      anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(idoName), Buffer.from("redeemable_mint")],
        program.programId
      ),
    poolHuskyverse: () =>
      anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(idoName), Buffer.from("pool_huskyverse")],
        program.programId
      ),

    poolUsdc: () =>
      anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(idoName), Buffer.from("pool_usdc")],
        program.programId
      ),

    userRedeemable: (userPubkey) =>
      anchor.web3.PublicKey.findProgramAddress(
        [
          userPubkey.toBuffer(),
          Buffer.from(idoName),
          Buffer.from("user_redeemable"),
        ],
        program.programId
      ),
    escrowUsdc: (userPubkey) =>
      anchor.web3.PublicKey.findProgramAddress(
        [
          userPubkey.toBuffer(),
          Buffer.from(idoName),
          Buffer.from("escrow_usdc"),
        ],
        program.programId
      ),
  };

  return {
    initializePool: async (
      { usdcMint, huskyverseMint, idoAuthorityHuskyverse } = _deps,
      idoTimes,
      idoAmount
    ) => {
      let bumps = new PoolBumps();

      const [idoAccount, idoAccountBump] = await accounts.ido();
      bumps.idoAccount = idoAccountBump;

      const [redeemableMint, redeemableMintBump] =
        await accounts.redeemableMint();
      bumps.redeemableMint = redeemableMintBump;

      const [poolHuskyverse, poolHuskyverseBump] =
        await accounts.poolHuskyverse();
      bumps.poolHuskyverse = poolHuskyverseBump;

      const [poolUsdc, poolUsdcBump] = await accounts.poolUsdc();
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
      userPubkey,
      userUsdc,
      depositAmount,
      signers // leave blank if use providers
    ) => {
      const [idoAccount] = await accounts.ido();
      const [redeemableMint] = await accounts.redeemableMint();

      const [poolUsdc] = await accounts.poolUsdc();
      const [userRedeemable] = await accounts.userRedeemable(userPubkey);

      return await program.rpc.exchangeUsdcForRedeemable(depositAmount, {
        accounts: {
          userAuthority: userPubkey,
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
          // TODO: condition on if user redeemable exists?
          program.instruction.initUserRedeemable({
            accounts: {
              userAuthority: userPubkey,
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
    exchangeRedeemableForUsdc: async (
      { usdcMint, huskyverseMint } = _deps,
      userPubKey,
      withdrawalAmount
    ) => {
      const [idoAccount] = await accounts.ido();
      const [redeemableMint] = await accounts.redeemableMint();
      const [poolUsdc] = await accounts.poolUsdc();
      const [userRedeemable] = await accounts.userRedeemable(userPubKey);
      const [escrowUsdc] = await accounts.escrowUsdc(userPubKey);

      return await program.rpc.exchangeRedeemableForUsdc(withdrawalAmount, {
        accounts: {
          userAuthority: userPubKey,
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
          // TODO: condition on if escrow exists?
          program.instruction.initEscrowUsdc({
            accounts: {
              userAuthority: userPubKey,
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
    },
    exchangeRedeemableForHuskyverse: async (
      { huskyverseMint } = _deps,
      userHuskyverse,
      userPubKey,
      redeemableAmount,
      signers
    ) => {
      const [idoAccount] = await accounts.ido();
      const [poolHuskyverse] = await accounts.poolHuskyverse();
      const [redeemableMint] = await accounts.redeemableMint();
      const [userRedeemable] = await accounts.userRedeemable(userPubKey);

      return await program.rpc.exchangeRedeemableForHuskyverse(
        redeemableAmount,
        {
          accounts: {
            payer: userPubKey,
            userAuthority: userPubKey,
            userHuskyverse,
            userRedeemable,
            idoAccount,
            huskyverseMint,
            redeemableMint,
            poolHuskyverse,
            tokenProgram: TOKEN_PROGRAM_ID,
          },
          signers,
        }
      );
    },
    accounts,
  };
};