const anchor = require("@project-serum/anchor");
// const TokenInstructions = require("@project-serum/serum").TokenInstructions;
// const TOKEN_PROGRAM_ID = new anchor.web3.PublicKey(
//   TokenInstructions.TOKEN_PROGRAM_ID.toString()
// );

const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");

function PoolBumps() {
  this.idoAccount;
  this.redeemableMint;
  this.publicPoolHuskyverse;
  this.publicPoolUsdc;
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
    publicPoolHuskyverse: () =>
      anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(idoName), Buffer.from("public_pool_huskyverse")],
        program.programId
      ),

    publicPoolUsdc: () =>
      anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(idoName), Buffer.from("public_pool_usdc")],
        program.programId
      ),

    userRedeemable: (userPubKey) =>
      anchor.web3.PublicKey.findProgramAddress(
        [
          userPubKey.toBuffer(),
          Buffer.from(idoName),
          Buffer.from("user_redeemable"),
        ],
        program.programId
      ),

    userWithdrawLinearDecrease: (userPubKey) =>
      anchor.web3.PublicKey.findProgramAddress(
        [
          userPubKey.toBuffer(),
          Buffer.from(idoName),
          Buffer.from("user_withdraw_linear_decrease"),
        ],
        program.programId
      ),
  };

  return {
    initializePool: async (
      { usdcMint, huskyverseMint, idoAuthorityHuskyverse } = _deps,
      publicIdoTimes,
      idoAmount
    ) => {
      let bumps = new PoolBumps();

      const [idoAccount, idoAccountBump] = await accounts.ido();
      bumps.idoAccount = idoAccountBump;

      const [redeemableMint, redeemableMintBump] =
        await accounts.redeemableMint();
      bumps.redeemableMint = redeemableMintBump;

      const [publicPoolHuskyverse, publicPoolHuskyverseBump] =
        await accounts.publicPoolHuskyverse();
      bumps.publicPoolHuskyverse = publicPoolHuskyverseBump;

      const [publicPoolUsdc, publicPoolUsdcBump] = await accounts.publicPoolUsdc();
      bumps.publicPoolUsdc = publicPoolUsdcBump;

      return await program.rpc.initializePool(
        idoName,
        bumps,
        idoAmount,
        publicIdoTimes,
        {
          accounts: {
            idoAuthority: provider.wallet.publicKey,
            idoAuthorityHuskyverse,
            idoAccount,
            huskyverseMint,
            usdcMint,
            redeemableMint,
            publicPoolHuskyverse,
            publicPoolUsdc,
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

      const [publicPoolUsdc] = await accounts.publicPoolUsdc();
      const [userRedeemable] = await accounts.userRedeemable(userPubkey);

      let instructions = [];

      try {
        await provider.connection.getTokenAccountBalance(userRedeemable);
      } catch (_e) {
        console.log(
          "could not find account [userRedeemable]: ",
          userRedeemable.toBase58()
        );
        console.log("initializing...");
        instructions = [
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
        ];
      }

      return await program.rpc.exchangeUsdcForRedeemable(depositAmount, {
        accounts: {
          userAuthority: userPubkey,
          userUsdc,
          userRedeemable,
          idoAccount,
          usdcMint,
          redeemableMint,
          huskyverseMint,
          publicPoolUsdc,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
        instructions,
        signers,
      });
    },
    exchangeRedeemableForUsdc: async (
      { usdcMint, huskyverseMint } = _deps,
      userPubKey,
      userUsdc,
      withdrawalAmount
    ) => {
      const isMaxAmount = withdrawalAmount === "MAX";
      const [idoAccount] = await accounts.ido();
      const [redeemableMint] = await accounts.redeemableMint();
      const [publicPoolUsdc] = await accounts.publicPoolUsdc();
      const [userRedeemable] = await accounts.userRedeemable(userPubKey);
      const [userWithdrawLinearDecrease] =
        await accounts.userWithdrawLinearDecrease(userPubKey);

      return await program.rpc.exchangeRedeemableForUsdc(
        isMaxAmount,
        isMaxAmount ? new anchor.BN(0) : withdrawalAmount,
        {
          accounts: {
            userAuthority: userPubKey,
            userUsdc,
            userRedeemable,
            idoAccount,
            usdcMint,
            redeemableMint,
            huskyverseMint,
            publicPoolUsdc,
            userWithdrawLinearDecrease,
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          },
        }
      );
    },
    exchangeRedeemableForHuskyverse: async (
      { huskyverseMint } = _deps,
      userHuskyverse,
      userPubKey,
      redeemableAmount,
      signers
    ) => {
      const [idoAccount] = await accounts.ido();
      const [publicPoolHuskyverse] = await accounts.publicPoolHuskyverse();
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
            publicPoolHuskyverse,
            tokenProgram: TOKEN_PROGRAM_ID,
          },
          signers,
        }
      );
    },
    accounts,
  };
};
