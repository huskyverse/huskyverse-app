const anchor = require("@project-serum/anchor");
const { configEnv, createATA, createMint, mockUsdcMint } = require("./_util");
const { PublicKey, LAMPORTS_PER_SOL } = anchor.web3;

const provider = anchor.Provider.env();
anchor.setProvider(provider);

// DEVELOPMENT ONLY
const main = async () => {
  configEnv();
  const mockUSDCToken = await createMint(provider, mockUsdcMint, 6);

  // LOOP peer local env
  JSON.parse(process.env.TESTER_PUBKEYS)
    .map((k) => new PublicKey(k))
    .forEach(async (pk) => {
      const c = provider.connection;
      const airdropSignature = await c.requestAirdrop(pk, 1 * LAMPORTS_PER_SOL);

      await c.confirmTransaction(airdropSignature);

      const ata = await createATA(provider, mockUSDCToken.publicKey, pk);

      // mint to users
      await mockUSDCToken.mintTo(
        ata,
        provider.wallet.publicKey,
        [provider.wallet.payer],
        Math.floor(Math.random() * 10000000000)
      );
    });
};

main();