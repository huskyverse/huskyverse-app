declare function _exports(provider: any, program: any, idoName: any): {
    initializePool: ({ usdcMint, huskyverseMint, idoAuthorityHuskyverse }: any, idoTimes: any, idoAmount: any) => Promise<any>;
    exchangeUsdcForRedeemable: ({ usdcMint, huskyverseMint }: any, userPubkey: any, userUsdc: any, depositAmount: any, signers: any) => Promise<any>;
    exchangeRedeemableForUsdc: ({ usdcMint, huskyverseMint }: any, userPubKey: any, userUsdc: any, withdrawalAmount: any) => Promise<any>;
    exchangeRedeemableForHuskyverse: ({ huskyverseMint }: any, userHuskyverse: any, userPubKey: any, redeemableAmount: any, signers: any) => Promise<any>;
    accounts: {
        ido: () => Promise<[anchor.web3.PublicKey, number]>;
        redeemableMint: () => Promise<[anchor.web3.PublicKey, number]>;
        publicPoolHuskyverse: () => Promise<[anchor.web3.PublicKey, number]>;
        publicPoolUsdc: () => Promise<[anchor.web3.PublicKey, number]>;
        userRedeemable: (userPubkey: any) => Promise<[anchor.web3.PublicKey, number]>;
        userWithdrawLinearDecrease: (userPubkey: any) => Promise<[anchor.web3.PublicKey, number]>;
    };
};
export = _exports;
import anchor = require("@project-serum/anchor");
