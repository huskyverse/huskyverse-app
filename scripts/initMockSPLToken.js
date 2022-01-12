const anchor = require("@project-serum/anchor");
const { createATA, createMint, mockUsdcMint, mockHkvMint } = require("./_util");
const { PublicKey } = anchor.web3;

const provider = anchor.Provider.env();
anchor.setProvider(provider);

const main = async () => {
  // DEVELOPMENT ONLY
  const mockUSDCToken = await createMint(provider, mockUsdcMint, 6);
  const mockHKVToken = await createMint(provider, mockHkvMint, 8);

  // LOOP peer local env
  const test1 = new PublicKey("KCU83RuLfte5WTnCc1oSrVoVffsK6y66Lw2JFqHK4zY");
  const ata = await createATA(provider, mockUSDCToken.publicKey, test1);
  // mint to users
  await mockUSDCToken.mintTo(
    ata,
    provider.wallet.publicKey,
    [provider.wallet.payer],
    "99999999"
  );
};

main();
