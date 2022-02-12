const anchor = require("@project-serum/anchor");
const { sleep } = require("@project-serum/common");
const spl = require("@solana/spl-token");
const { configEnv, createATA, mockUsdcMint } = require("./_util");
const { PublicKey } = anchor.web3;

const provider = anchor.Provider.env();
anchor.setProvider(provider);

// DEVELOPMENT ONLY
const main = async () => {
  configEnv();
  const mockUSDCToken = new spl.Token(
    provider.connection,
    mockUsdcMint.publicKey,
    spl.TOKEN_PROGRAM_ID,
    provider.wallet.payer
  );

  // LOOP peer local env
  JSON.parse(process.env.TESTER_PUBKEYS)
    .map((k) => new PublicKey(k))
    .forEach(async (pk) => {
      const ata = await createATA(provider, mockUSDCToken.publicKey, pk);

      // mint to users
      await mockUSDCToken.mintTo(
        ata,
        provider.wallet.publicKey,
        [provider.wallet.payer],
        Math.floor(Math.random() * 10000000000000)
      );
    });
};

main();
