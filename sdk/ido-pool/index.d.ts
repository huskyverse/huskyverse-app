declare function _exports(provider: any, program: any, idoName: any): {
    initializePool: ({ usdcMint, huskyverseMint, idoAuthorityHuskyverse }: any, idoTimes: any, idoAmount: any) => Promise<any>;
    exchangeUsdcForRedeemable: ({ usdcMint, huskyverseMint }: any, userPubkey: any, userUsdc: any, depositAmount: any, signers: any) => Promise<any>;
    exchangeRedeemableForUsdc: ({ usdcMint, huskyverseMint }: any, userPubKey: any, userUsdc: any, withdrawalAmount: any) => Promise<any>;
    exchangeRedeemableForHuskyverse: ({ huskyverseMint }: any, userHuskyverse: any, userPubKey: any, redeemableAmount: any, signers: any) => Promise<any>;
};
export = _exports;
