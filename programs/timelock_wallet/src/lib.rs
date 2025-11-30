use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};

declare_id!("6oB3tWykpdeaRLbDeL4W1Hr386NFfxbeBPe99eTPxxzL");

#[program]
pub mod timelock_wallet {
    use super::*;

    /// Инициализация депозита по времени
    pub fn initialize_deposit(
        ctx: Context<InitializeDeposit>,
        amount: u64,
        unlock_timestamp: i64,
        counter: u32, // ← УБРАЛИ ПОДЧЕРКИВАНИЕ
    ) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);
        let current_timestamp = Clock::get()?.unix_timestamp;
        require!(
            unlock_timestamp > current_timestamp,
            ErrorCode::InvalidTimestamp
        );

        let deposit = &mut ctx.accounts.deposit;
        deposit.owner = ctx.accounts.owner.key();
        deposit.mint = ctx.accounts.mint.key();
        deposit.vault_token_account = ctx.accounts.vault_token_account.key();
        deposit.amount = amount;
        deposit.lock_condition = LockCondition {
            unlock_timestamp,
            unlock_amount: 0,
            condition_type: ConditionType::ByTime,
        };
        deposit.lock_seed = unlock_timestamp.to_le_bytes();
        deposit.counter = counter; // ← СОХРАНЯЕМ COUNTER
        deposit.state = DepositState::Active;
        deposit.created_at = current_timestamp;
        deposit.bump = ctx.bumps.deposit;

        let transfer_instruction = Transfer {
            from: ctx.accounts.owner_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_instruction,
        );
        token::transfer(cpi_ctx, amount)?;

        emit!(DepositCreated {
            owner: deposit.owner,
            amount,
            unlock_timestamp,
            token: deposit.mint,
        });

        Ok(())
    }

    /// Инициализация депозита по сумме
    pub fn initialize_deposit_by_amount(
        ctx: Context<InitializeDepositByAmount>,
        amount: u64,
        unlock_amount: u64,
        counter: u32, // ← УБРАЛИ ПОДЧЕРКИВАНИЕ
    ) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(unlock_amount > 0, ErrorCode::InvalidAmount);

        let current_timestamp = Clock::get()?.unix_timestamp;

        let deposit = &mut ctx.accounts.deposit;
        deposit.owner = ctx.accounts.owner.key();
        deposit.mint = ctx.accounts.mint.key();
        deposit.vault_token_account = ctx.accounts.vault_token_account.key();
        deposit.amount = amount;
        deposit.lock_condition = LockCondition {
            unlock_timestamp: 0,
            unlock_amount,
            condition_type: ConditionType::ByAmount,
        };
        deposit.lock_seed = unlock_amount.to_le_bytes();
        deposit.counter = counter; // ← СОХРАНЯЕМ COUNTER
        deposit.state = DepositState::Active;
        deposit.created_at = current_timestamp;
        deposit.bump = ctx.bumps.deposit;

        let transfer_instruction = Transfer {
            from: ctx.accounts.owner_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_instruction,
        );
        token::transfer(cpi_ctx, amount)?;

        emit!(DepositCreatedByAmount {
            owner: deposit.owner,
            amount,
            unlock_amount,
            token: deposit.mint,
        });

        Ok(())
    }

    pub fn add_funds(
        ctx: Context<AddFunds>,
        additional_amount: u64,
    ) -> Result<()> {
        require!(additional_amount > 0, ErrorCode::InvalidAmount);
        require!(
            ctx.accounts.deposit.state == DepositState::Active,
            ErrorCode::NotActive
        );
        require!(
            ctx.accounts.deposit.owner == ctx.accounts.owner.key(),
            ErrorCode::Unauthorized
        );

        let new_amount = ctx.accounts.deposit.amount
            .checked_add(additional_amount)
            .ok_or(ErrorCode::Overflow)?;
        ctx.accounts.deposit.amount = new_amount;

        let transfer_instruction = Transfer {
            from: ctx.accounts.owner_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_instruction,
        );
        token::transfer(cpi_ctx, additional_amount)?;

        emit!(DepositFundsAdded {
            owner: ctx.accounts.deposit.owner,
            deposit: ctx.accounts.deposit.key(),
            additional_amount,
            new_total_amount: ctx.accounts.deposit.amount,
        });

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        require!(
            ctx.accounts.deposit.state == DepositState::Active,
            ErrorCode::NotActive
        );
        require!(
            ctx.accounts.deposit.owner == ctx.accounts.owner.key(),
            ErrorCode::Unauthorized
        );

        let current_timestamp = Clock::get()?.unix_timestamp;

        match ctx.accounts.deposit.lock_condition.condition_type {
            ConditionType::ByTime => {
                require!(
                    current_timestamp >= ctx.accounts.deposit.lock_condition.unlock_timestamp,
                    ErrorCode::ConditionsNotMet
                );
            }
            ConditionType::ByAmount => {
                require!(
                    ctx.accounts.deposit.amount >= ctx.accounts.deposit.lock_condition.unlock_amount,
                    ErrorCode::ConditionsNotMet
                );
            }
        }

        let owner = ctx.accounts.deposit.owner;
        let amount = ctx.accounts.deposit.amount;
        let mint = ctx.accounts.deposit.mint;

        // ОБНОВЛЕННЫЕ SEEDS С COUNTER
        let seeds = &[
            b"deposit",
            ctx.accounts.deposit.owner.as_ref(),
            &ctx.accounts.deposit.lock_seed[..],
            &ctx.accounts.deposit.counter.to_le_bytes(), // ← ДОБАВИЛИ COUNTER
            &[ctx.accounts.deposit.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let transfer_instruction = Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.owner_token_account.to_account_info(),
            authority: ctx.accounts.deposit.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            transfer_instruction,
            signer_seeds,
        );
        token::transfer(cpi_ctx, amount)?;

        ctx.accounts.deposit.amount = 0;
        ctx.accounts.deposit.state = DepositState::Withdrawn;

        emit!(DepositWithdrawn {
            owner,
            amount,
            token: mint,
            time: current_timestamp,
        });

        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct TimeLockDeposit {
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub vault_token_account: Pubkey,
    pub amount: u64,
    pub lock_condition: LockCondition,
    pub lock_seed: [u8; 8],
    pub counter: u32, // ← ДОБАВИЛИ ПОЛЕ COUNTER
    pub state: DepositState,
    pub created_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct LockCondition {
    pub unlock_timestamp: i64,
    pub unlock_amount: u64,
    pub condition_type: ConditionType,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub enum ConditionType {
    ByTime,
    ByAmount,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, InitSpace)]
pub enum DepositState {
    Active,
    Withdrawn,
}

/// Контекст создания депозита по времени
#[derive(Accounts)]
#[instruction(amount: u64, unlock_timestamp: i64, counter: u32)]
pub struct InitializeDeposit<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = 8 + TimeLockDeposit::INIT_SPACE,
        seeds = [
            b"deposit",
            owner.key().as_ref(),
            &unlock_timestamp.to_le_bytes(),
            &counter.to_le_bytes() 
        ],
        bump
    )]
    pub deposit: Account<'info, TimeLockDeposit>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = owner_token_account.owner == owner.key(),
        constraint = owner_token_account.mint == mint.key()
    )]
    pub owner_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = owner,
        token::mint = mint,
        token::authority = deposit,
        seeds = [b"vault", deposit.key().as_ref()],
        bump
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

/// Контекст создания депозита по сумме
#[derive(Accounts)]
#[instruction(amount: u64, unlock_amount: u64, counter: u32)]
pub struct InitializeDepositByAmount<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = 8 + TimeLockDeposit::INIT_SPACE,
        seeds = [
            b"deposit",
            owner.key().as_ref(),
            &unlock_amount.to_le_bytes(),
            &counter.to_le_bytes()
        ],
        bump
    )]
    pub deposit: Account<'info, TimeLockDeposit>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = owner_token_account.owner == owner.key(),
        constraint = owner_token_account.mint == mint.key()
    )]
    pub owner_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = owner,
        token::mint = mint,
        token::authority = deposit,
        seeds = [b"vault", deposit.key().as_ref()],
        bump
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct AddFunds<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [
            b"deposit",
            deposit.owner.as_ref(),
            &deposit.lock_seed[..8],
            &deposit.counter.to_le_bytes() // ← ДОБАВИЛИ COUNTER
        ],
        bump = deposit.bump
    )]
    pub deposit: Account<'info, TimeLockDeposit>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = owner_token_account.owner == owner.key(),
        constraint = owner_token_account.mint == mint.key()
    )]
    pub owner_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = vault_token_account.key() == deposit.vault_token_account,
        constraint = vault_token_account.mint == deposit.mint
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        close = owner,
        seeds = [
            b"deposit",
            deposit.owner.as_ref(),
            &deposit.lock_seed[..8],
            &deposit.counter.to_le_bytes() // ← ДОБАВИЛИ COUNTER
        ],
        bump = deposit.bump
    )]
    pub deposit: Account<'info, TimeLockDeposit>,

    #[account(
        mut,
        constraint = vault_token_account.key() == deposit.vault_token_account,
        constraint = vault_token_account.amount >= deposit.amount
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = owner_token_account.owner == owner.key(),
        constraint = owner_token_account.mint == deposit.mint
    )]
    pub owner_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[event]
pub struct DepositCreated {
    pub owner: Pubkey,
    pub amount: u64,
    pub unlock_timestamp: i64,
    pub token: Pubkey,
}

#[event]
pub struct DepositCreatedByAmount {
    pub owner: Pubkey,
    pub amount: u64,
    pub unlock_amount: u64,
    pub token: Pubkey,
}

#[event]
pub struct DepositFundsAdded {
    pub owner: Pubkey,
    pub deposit: Pubkey,
    pub additional_amount: u64,
    pub new_total_amount: u64,
}

#[event]
pub struct DepositWithdrawn {
    pub owner: Pubkey,
    pub amount: u64,
    pub token: Pubkey,
    pub time: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid timestamp")]
    InvalidTimestamp,
    #[msg("Deposit is not active")]
    NotActive,
    #[msg("Withdrawal conditions not met")]
    ConditionsNotMet,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Overflow")]
    Overflow,
}