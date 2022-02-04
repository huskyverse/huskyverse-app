//! An IDO pool program implementing the Mango Markets token sale design here:
//! https://docs.mango.markets/litepaper#token-sale.
// #![warn(clippy::all)]

use anchor_lang::prelude::*;
use anchor_spl::token::{
    self, Burn, CloseAccount, Mint, MintTo, Token, TokenAccount, Transfer,
};

use std::ops::Deref;

declare_id!("HU2fHYFndVc8UX8fJmhK5ea3bC4UfUFLieNh18fEQ6ad");

const DECIMALS: u8 = 6;

#[program]
pub mod ido_pool {
    use super::*;

    #[access_control(validate_ido_times(ido_times))]
    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        ido_name: String,
        bumps: PoolBumps,
        num_ido_tokens: u64,
        ido_times: IdoTimes,
    ) -> ProgramResult {
        msg!("INITIALIZE POOL");

        let ido_account = &mut ctx.accounts.ido_account;

        let name_bytes = ido_name.as_bytes();
        let mut name_data = [b' '; 10];
        name_data[..name_bytes.len()].copy_from_slice(name_bytes);

        ido_account.ido_name = name_data;
        ido_account.bumps = bumps;
        ido_account.ido_authority = ctx.accounts.ido_authority.key();

        ido_account.usdc_mint = ctx.accounts.usdc_mint.key();
        ido_account.redeemable_mint = ctx.accounts.redeemable_mint.key();
        ido_account.huskyverse_mint = ctx.accounts.huskyverse_mint.key();
        ido_account.pool_usdc = ctx.accounts.pool_usdc.key();
        ido_account.pool_huskyverse = ctx.accounts.pool_huskyverse.key();

        ido_account.num_ido_tokens = num_ido_tokens;
        ido_account.ido_times = ido_times;

        // Transfer huskyverse from ido_authority to pool account.
        let cpi_accounts = Transfer {
            from: ctx.accounts.ido_authority_huskyverse.to_account_info(),
            to: ctx.accounts.pool_huskyverse.to_account_info(),
            authority: ctx.accounts.ido_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, num_ido_tokens)?;

        Ok(())
    }

    #[access_control(unrestricted_phase(&ctx.accounts.ido_account))]
    pub fn init_user_redeemable(ctx: Context<InitUserRedeemable>) -> ProgramResult {
        msg!("INIT USER REDEEMABLE");
        Ok(())
    }

    #[access_control(unrestricted_phase(&ctx.accounts.ido_account))]
    pub fn exchange_usdc_for_redeemable(
        ctx: Context<ExchangeUsdcForRedeemable>,
        amount: u64,
    ) -> ProgramResult {
        msg!("EXCHANGE USDC FOR REDEEMABLE");
        // While token::transfer will check this, we prefer a verbose err msg.
        if ctx.accounts.user_usdc.amount < amount {
            return Err(ErrorCode::LowUsdc.into());
        }

        // Transfer user's USDC to pool USDC account.
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_usdc.to_account_info(),
            to: ctx.accounts.pool_usdc.to_account_info(),
            authority: ctx.accounts.user_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        // Mint Redeemable to user Redeemable account.
        let ido_name = ctx.accounts.ido_account.ido_name.as_ref();
        let seeds = &[
            ido_name.trim_ascii_whitespace(),
            &[ctx.accounts.ido_account.bumps.ido_account],
        ];
        let signer = &[&seeds[..]];
        let cpi_accounts = MintTo {
            mint: ctx.accounts.redeemable_mint.to_account_info(),
            to: ctx.accounts.user_redeemable.to_account_info(),
            authority: ctx.accounts.ido_account.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::mint_to(cpi_ctx, amount)?;

        Ok(())
    }

    #[access_control(withdraw_phase(&ctx.accounts.ido_account))]
    pub fn exchange_redeemable_for_usdc(
        ctx: Context<ExchangeRedeemableForUsdc>,
        max_withdraw: bool,
        amount: u64,
    ) -> ProgramResult {
        msg!("EXCHANGE REDEEMABLE FOR USDC");
        if ctx.accounts.user_withdraw_linear_decrease.withdrawn {
            return Err(ErrorCode::ExceedLinearDecreaseWithdrawLimit.into());
        }

        let clock = Clock::get()?;

        let is_in_unrestricted_phase = match unrestricted_phase(ctx.accounts.ido_account.as_ref()) {
            Ok(()) => true,
            _ => false,
        };

        let max_redeemable = if is_in_unrestricted_phase {
            ctx.accounts.user_redeemable.amount
        } else {
            ctx.accounts.user_withdraw_linear_decrease.withdrawn = true;

            let withdraw_only_period = ctx
                .accounts
                .ido_account
                .ido_times
                .end_ido
                .checked_sub(ctx.accounts.ido_account.ido_times.end_deposits)
                .unwrap();

            let ratio = clock
                .unix_timestamp
                .checked_sub(ctx.accounts.ido_account.ido_times.end_deposits)
                .unwrap()
                .checked_div(withdraw_only_period)
                .unwrap();

            (ratio as u64)
                .checked_mul(ctx.accounts.user_redeemable.amount)
                .unwrap()
        };

        let withdraw_amount = if max_withdraw { max_redeemable } else { amount };

        if max_redeemable < withdraw_amount || max_redeemable == 0 {
            return Err(ErrorCode::ExceedMaxRedeemable.into());
        }

        let ido_name = ctx.accounts.ido_account.ido_name.as_ref();
        let seeds = &[
            ido_name.trim_ascii_whitespace(),
            &[ctx.accounts.ido_account.bumps.ido_account],
        ];
        let signer = &[&seeds[..]];

        burn(
            ctx.accounts.redeemable_mint.as_ref(),
            ctx.accounts.user_redeemable.as_ref(),
            ctx.accounts.ido_account.as_ref(),
            &ctx.accounts.token_program,
            withdraw_amount,
            signer,
        )?;

        transfer(
            ctx.accounts.pool_usdc.as_ref(),
            ctx.accounts.user_usdc.as_ref(),
            ctx.accounts.ido_account.as_ref(),
            &ctx.accounts.token_program,
            withdraw_amount,
            signer,
        )?;

        Ok(())
    }

    #[access_control(ido_over(&ctx.accounts.ido_account))]
    pub fn exchange_redeemable_for_huskyverse(
        ctx: Context<ExchangeRedeemableForHuskyverse>,
        amount: u64,
    ) -> ProgramResult {
        msg!("EXCHANGE REDEEMABLE FOR huskyverse");
        // While token::burn will check this, we prefer a verbose err msg.
        if ctx.accounts.user_redeemable.amount < amount {
            return Err(ErrorCode::LowRedeemable.into());
        }

        // Calculate huskyverse tokens due.
        let huskyverse_amount = (amount as u128)
            .checked_mul(ctx.accounts.pool_huskyverse.amount as u128)
            .unwrap()
            .checked_div(ctx.accounts.redeemable_mint.supply as u128)
            .unwrap();

        let ido_name = ctx.accounts.ido_account.ido_name.as_ref();
        let seeds = &[
            ido_name.trim_ascii_whitespace(),
            &[ctx.accounts.ido_account.bumps.ido_account],
        ];
        let signer = &[&seeds[..]];

        // Burn the user's redeemable tokens.
        let cpi_accounts = Burn {
            mint: ctx.accounts.redeemable_mint.to_account_info(),
            to: ctx.accounts.user_redeemable.to_account_info(),
            authority: ctx.accounts.ido_account.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::burn(cpi_ctx, amount)?;

        // Transfer huskyverse from pool account to user.
        let cpi_accounts = Transfer {
            from: ctx.accounts.pool_huskyverse.to_account_info(),
            to: ctx.accounts.user_huskyverse.to_account_info(),
            authority: ctx.accounts.ido_account.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, huskyverse_amount as u64)?;

        // Send rent back to user if account is empty
        ctx.accounts.user_redeemable.reload()?;
        if ctx.accounts.user_redeemable.amount == 0 {
            let cpi_accounts = CloseAccount {
                account: ctx.accounts.user_redeemable.to_account_info(),
                destination: ctx.accounts.user_authority.clone(),
                authority: ctx.accounts.ido_account.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
            token::close_account(cpi_ctx)?;
        }

        Ok(())
    }

    #[access_control(ido_over(&ctx.accounts.ido_account))]
    pub fn withdraw_pool_usdc(ctx: Context<WithdrawPoolUsdc>) -> ProgramResult {
        msg!("WITHDRAW POOL USDC");
        // Transfer total USDC from pool account to ido_authority account.
        let ido_name = ctx.accounts.ido_account.ido_name.as_ref();
        let seeds = &[
            ido_name.trim_ascii_whitespace(),
            &[ctx.accounts.ido_account.bumps.ido_account],
        ];
        let signer = &[&seeds[..]];
        let cpi_accounts = Transfer {
            from: ctx.accounts.pool_usdc.to_account_info(),
            to: ctx.accounts.ido_authority_usdc.to_account_info(),
            authority: ctx.accounts.ido_account.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, ctx.accounts.pool_usdc.amount)?;

        Ok(())
    }
}

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

#[derive(Accounts)]
#[instruction(ido_name: String, bumps: PoolBumps)]
pub struct InitializePool<'info> {
    // IDO Authority accounts
    #[account(mut)]
    pub ido_authority: Signer<'info>,
    // huskyverse Doesn't have to be an ATA because it could be DAO controlled
    #[account(mut,
        constraint = ido_authority_huskyverse.owner == ido_authority.key(),
        constraint = ido_authority_huskyverse.mint == huskyverse_mint.key())]
    pub ido_authority_huskyverse: Box<Account<'info, TokenAccount>>,
    // IDO Accounts
    #[account(init,
        seeds = [ido_name.as_bytes()],
        bump = bumps.ido_account,
        payer = ido_authority)]
    pub ido_account: Box<Account<'info, IdoAccount>>,
    // TODO Confirm USDC mint address on mainnet or leave open as an option for other stables
    #[account(constraint = usdc_mint.decimals == DECIMALS)]
    pub usdc_mint: Box<Account<'info, Mint>>,
    #[account(init,
        mint::decimals = DECIMALS,
        mint::authority = ido_account,
        seeds = [ido_name.as_bytes(), b"redeemable_mint".as_ref()],
        bump = bumps.redeemable_mint,
        payer = ido_authority)]
    pub redeemable_mint: Box<Account<'info, Mint>>,
    #[account(constraint = huskyverse_mint.key() == ido_authority_huskyverse.mint)]
    pub huskyverse_mint: Box<Account<'info, Mint>>,
    #[account(init,
        token::mint = huskyverse_mint,
        token::authority = ido_account,
        seeds = [ido_name.as_bytes(), b"pool_huskyverse"],
        bump = bumps.pool_huskyverse,
        payer = ido_authority)]
    pub pool_huskyverse: Box<Account<'info, TokenAccount>>,
    #[account(init,
        token::mint = usdc_mint,
        token::authority = ido_account,
        seeds = [ido_name.as_bytes(), b"pool_usdc"],
        bump = bumps.pool_usdc,
        payer = ido_authority)]
    pub pool_usdc: Box<Account<'info, TokenAccount>>,
    // Programs and Sysvars
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct InitUserRedeemable<'info> {
    // User Accounts
    #[account(mut)]
    pub user_authority: Signer<'info>,
    #[account(init,
        token::mint = redeemable_mint,
        token::authority = ido_account,
        seeds = [user_authority.key().as_ref(),
            ido_account.ido_name.as_ref().trim_ascii_whitespace(),
            b"user_redeemable"],
        bump,
        payer = user_authority)]
    pub user_redeemable: Box<Account<'info, TokenAccount>>,
    // IDO Accounts
    #[account(seeds = [ido_account.ido_name.as_ref().trim_ascii_whitespace()],
        bump = ido_account.bumps.ido_account)]
    pub ido_account: Box<Account<'info, IdoAccount>>,
    #[account(seeds = [ido_account.ido_name.as_ref().trim_ascii_whitespace(), b"redeemable_mint"],
        bump = ido_account.bumps.redeemable_mint)]
    pub redeemable_mint: Box<Account<'info, Mint>>,
    // Programs and Sysvars
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct ExchangeUsdcForRedeemable<'info> {
    // User Accounts
    pub user_authority: Signer<'info>,
    // TODO replace these with the ATA constraints when possible
    #[account(mut,
        constraint = user_usdc.owner == user_authority.key(),
        constraint = user_usdc.mint == usdc_mint.key())]
    pub user_usdc: Box<Account<'info, TokenAccount>>,
    #[account(mut,
        seeds = [user_authority.key().as_ref(),
            ido_account.ido_name.as_ref().trim_ascii_whitespace(),
            b"user_redeemable"],
        bump)]
    pub user_redeemable: Box<Account<'info, TokenAccount>>,
    // IDO Accounts
    #[account(seeds = [ido_account.ido_name.as_ref().trim_ascii_whitespace()],
        bump = ido_account.bumps.ido_account,
        has_one = usdc_mint)]
    pub ido_account: Box<Account<'info, IdoAccount>>,
    pub usdc_mint: Box<Account<'info, Mint>>,
    #[account(mut,
        seeds = [ido_account.ido_name.as_ref().trim_ascii_whitespace(), b"redeemable_mint"],
        bump = ido_account.bumps.redeemable_mint)]
    pub redeemable_mint: Box<Account<'info, Mint>>,
    #[account(mut,
        seeds = [ido_account.ido_name.as_ref().trim_ascii_whitespace(), b"pool_usdc"],
        bump = ido_account.bumps.pool_usdc)]
    pub pool_usdc: Box<Account<'info, TokenAccount>>,
    // Programs and Sysvars
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ExchangeRedeemableForUsdc<'info> {
    // User Accounts
    pub user_authority: Signer<'info>,
    #[account(mut,
        constraint = user_usdc.owner == user_authority.key(),
        constraint = user_usdc.mint == usdc_mint.key())]
    pub user_usdc: Box<Account<'info, TokenAccount>>,
    #[account(mut,
        seeds = [user_authority.key().as_ref(),
            ido_account.ido_name.as_ref().trim_ascii_whitespace(),
            b"user_redeemable"],
        bump)]
    pub user_redeemable: Box<Account<'info, TokenAccount>>,
    // IDO Accounts
    #[account(seeds = [ido_account.ido_name.as_ref().trim_ascii_whitespace()],
        bump = ido_account.bumps.ido_account,
        has_one = usdc_mint)]
    pub ido_account: Box<Account<'info, IdoAccount>>,
    pub usdc_mint: Box<Account<'info, Mint>>,
    pub huskyverse_mint: Box<Account<'info, Mint>>,
    #[account(mut,
        seeds = [ido_account.ido_name.as_ref().trim_ascii_whitespace(), b"redeemable_mint"],
        bump = ido_account.bumps.redeemable_mint)]
    pub redeemable_mint: Box<Account<'info, Mint>>,
    #[account(mut,
        seeds = [ido_account.ido_name.as_ref().trim_ascii_whitespace(), b"pool_usdc"],
        bump = ido_account.bumps.pool_usdc)]
    pub pool_usdc: Box<Account<'info, TokenAccount>>,
    #[account(init_if_needed,
        seeds = [user_authority.key().as_ref(),
            ido_account.ido_name.as_ref().trim_ascii_whitespace(),
            b"user_withdraw_linear_decrease"],
        bump,
        payer = user_authority)]
    pub user_withdraw_linear_decrease: Box<Account<'info, LinearDecreaseWithdrawAccount>>,
    // Programs and Sysvars
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct ExchangeRedeemableForHuskyverse<'info> {
    // User does not have to sign, this allows anyone to redeem on their behalf
    // and prevents forgotten / leftover redeemable tokens in the IDO pool.
    pub payer: Signer<'info>,
    // User Accounts
    #[account(mut)] // Sol rent from empty redeemable account is refunded to the user
    pub user_authority: AccountInfo<'info>,
    // TODO replace with ATA constraints
    #[account(mut,
        constraint = user_huskyverse.owner == user_authority.key(),
        constraint = user_huskyverse.mint == huskyverse_mint.key())]
    pub user_huskyverse: Box<Account<'info, TokenAccount>>,
    #[account(mut,
        seeds = [user_authority.key().as_ref(),
            ido_account.ido_name.as_ref().trim_ascii_whitespace(),
            b"user_redeemable"],
        bump)]
    pub user_redeemable: Box<Account<'info, TokenAccount>>,
    // IDO Accounts
    #[account(seeds = [ido_account.ido_name.as_ref().trim_ascii_whitespace()],
        bump = ido_account.bumps.ido_account,
        has_one = huskyverse_mint)]
    pub ido_account: Box<Account<'info, IdoAccount>>,
    pub huskyverse_mint: Box<Account<'info, Mint>>,
    #[account(mut,
        seeds = [ido_account.ido_name.as_ref().trim_ascii_whitespace(), b"redeemable_mint"],
        bump = ido_account.bumps.redeemable_mint)]
    pub redeemable_mint: Box<Account<'info, Mint>>,
    #[account(mut,
        seeds = [ido_account.ido_name.as_ref().trim_ascii_whitespace(), b"pool_huskyverse"],
        bump = ido_account.bumps.pool_huskyverse)]
    pub pool_huskyverse: Box<Account<'info, TokenAccount>>,
    // Programs and Sysvars
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawPoolUsdc<'info> {
    // IDO Authority Accounts
    pub ido_authority: Signer<'info>,
    // Doesn't need to be an ATA because it might be a DAO account
    #[account(mut,
        constraint = ido_authority_usdc.owner == ido_authority.key(),
        constraint = ido_authority_usdc.mint == usdc_mint.key())]
    pub ido_authority_usdc: Box<Account<'info, TokenAccount>>,
    // IDO Accounts
    #[account(seeds = [ido_account.ido_name.as_ref().trim_ascii_whitespace()],
        bump = ido_account.bumps.ido_account,
        has_one = ido_authority,
        has_one = usdc_mint,
        has_one = huskyverse_mint)]
    pub ido_account: Box<Account<'info, IdoAccount>>,
    pub usdc_mint: Box<Account<'info, Mint>>,
    pub huskyverse_mint: Box<Account<'info, Mint>>,
    #[account(mut,
        seeds = [ido_account.ido_name.as_ref().trim_ascii_whitespace(), b"pool_usdc"],
        bump = ido_account.bumps.pool_usdc)]
    pub pool_usdc: Box<Account<'info, TokenAccount>>,
    // Program and Sysvars
    pub token_program: Program<'info, Token>,
}

#[account]
#[derive(Default)]
pub struct IdoAccount {
    pub ido_name: [u8; 10], // Setting an arbitrary max of ten characters in the ido name.
    pub bumps: PoolBumps,
    pub ido_authority: Pubkey,

    pub usdc_mint: Pubkey,
    pub redeemable_mint: Pubkey,
    pub huskyverse_mint: Pubkey,
    pub pool_usdc: Pubkey,
    pub pool_huskyverse: Pubkey,

    pub num_ido_tokens: u64,
    pub ido_times: IdoTimes,
}

#[account]
#[derive(Default, Copy)]
pub struct LinearDecreaseWithdrawAccount {
    pub withdrawn: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone, Copy)]
pub struct IdoTimes {
    pub start_ido: i64,
    pub end_deposits: i64,
    pub end_ido: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone)]
pub struct PoolBumps {
    pub ido_account: u8,
    pub redeemable_mint: u8,
    pub pool_huskyverse: u8,
    pub pool_usdc: u8,
}

#[error]
pub enum ErrorCode {
    #[msg("IDO must start in the future")]
    IdoFuture,
    #[msg("IDO times are non-sequential")]
    SeqTimes,
    #[msg("IDO has not started")]
    StartIdoTime,
    #[msg("Deposits period has ended")]
    EndDepositsTime,
    #[msg("IDO has ended")]
    EndIdoTime,
    #[msg("IDO has not finished yet")]
    IdoNotOver,
    #[msg("Escrow period has not finished yet")]
    EscrowNotOver,
    #[msg("Insufficient USDC")]
    LowUsdc,
    #[msg("Insufficient redeemable tokens")]
    LowRedeemable,
    #[msg("Exceed max redeemable tokens")]
    ExceedMaxRedeemable,
    #[msg("USDC total and redeemable total don't match")]
    UsdcNotEqRedeem,
    #[msg("Given nonce is invalid")]
    InvalidNonce,
    #[msg("Exceed withdraw limit during linear decrease withdraw phase")]
    ExceedLinearDecreaseWithdrawLimit,
}

// Access control modifiers.

// Asserts the IDO starts in the future.
fn validate_ido_times(ido_times: IdoTimes) -> ProgramResult {
    let clock = Clock::get()?;
    if ido_times.start_ido <= clock.unix_timestamp {
        return Err(ErrorCode::IdoFuture.into());
    }
    if !(ido_times.start_ido < ido_times.end_deposits && ido_times.end_deposits < ido_times.end_ido)
    {
        return Err(ErrorCode::SeqTimes.into());
    }
    Ok(())
}

// Asserts the IDO is still accepting deposits.
fn unrestricted_phase(ido_account: &IdoAccount) -> ProgramResult {
    let clock = Clock::get()?;
    if clock.unix_timestamp <= ido_account.ido_times.start_ido {
        return Err(ErrorCode::StartIdoTime.into());
    } else if ido_account.ido_times.end_deposits <= clock.unix_timestamp {
        return Err(ErrorCode::EndDepositsTime.into());
    }
    Ok(())
}

// Asserts the IDO has started but not yet finished.
fn withdraw_phase(ido_account: &IdoAccount) -> ProgramResult {
    let clock = Clock::get()?;
    if clock.unix_timestamp <= ido_account.ido_times.start_ido {
        return Err(ErrorCode::StartIdoTime.into());
    } else if ido_account.ido_times.end_ido <= clock.unix_timestamp {
        return Err(ErrorCode::EndIdoTime.into());
    }
    Ok(())
}

// Asserts the IDO sale period has ended.
fn ido_over(ido_account: &IdoAccount) -> ProgramResult {
    let clock = Clock::get()?;
    if clock.unix_timestamp <= ido_account.ido_times.end_ido {
        return Err(ErrorCode::IdoNotOver.into());
    }
    Ok(())
}

/// Trait to allow trimming ascii whitespace from a &[u8].
pub trait TrimAsciiWhitespace {
    /// Trim ascii whitespace (based on `is_ascii_whitespace()`) from the
    /// start and end of a slice.
    fn trim_ascii_whitespace(&self) -> &[u8];
}

impl<T: Deref<Target = [u8]>> TrimAsciiWhitespace for T {
    fn trim_ascii_whitespace(&self) -> &[u8] {
        let from = match self.iter().position(|x| !x.is_ascii_whitespace()) {
            Some(i) => i,
            None => return &self[0..0],
        };
        let to = self.iter().rposition(|x| !x.is_ascii_whitespace()).unwrap();
        &self[from..=to]
    }
}
