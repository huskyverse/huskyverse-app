use anchor_lang::{prelude::ProgramResult, Account, CpiContext, Program, ToAccountInfo};
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount, Transfer};

use crate::IdoAccount;

pub fn burn<'info>(
    mint: &Account<'info, Mint>,
    to: &Account<'info, TokenAccount>,
    authority: &Account<'info, IdoAccount>,
    token_program: &Program<'info, Token>,
    amount: u64,
    signer: &[&[&[u8]]; 1],
) -> ProgramResult {
    // Burn the user's redeemable tokens.
    let cpi_accounts = Burn {
        mint: mint.to_account_info(),
        to: to.to_account_info(),
        authority: authority.to_account_info(),
    };
    let cpi_program = token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    token::burn(cpi_ctx, amount)?;
    Ok(())
}

pub fn transfer<'info>(
    from: &Account<'info, TokenAccount>,
    to: &Account<'info, TokenAccount>,
    authority: &Account<'info, IdoAccount>,
    token_program: &Program<'info, Token>,
    amount: u64,
    signer: &[&[&[u8]]; 1],
) -> ProgramResult {
    let cpi_accounts = Transfer {
        from: from.to_account_info(),
        to: to.to_account_info(),
        authority: authority.to_account_info(),
    };
    let cpi_program = token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    token::transfer(cpi_ctx, amount)?;
    Ok(())
}
