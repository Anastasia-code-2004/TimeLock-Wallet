use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};

//declare_id!("3bL1e2w6nr2pg5RrPxdSAYw7bM9yFJ2mxW91Zrma62aF");
declare_id!("CPPQFeBovJRCeLQ1Kh7HAX9qQMszh42XMBMpHMrrXBkD");

#[program]
pub mod timelock_wallet {
    use super::*;

    /// Инициализация депозита по времени (как было)
    pub fn initialize_deposit(
        ctx: Context<InitializeDeposit>,
        amount: u64,
        unlock_timestamp: i64,
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
        // сохраняем seed (8 байт) для PDA-совместимости
        deposit.lock_seed = unlock_timestamp.to_le_bytes();
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

    /// Новая инициализация депозита: разблокировка по достижению суммы
    pub fn initialize_deposit_by_amount(
        ctx: Context<InitializeDepositByAmount>,
        amount: u64,
        unlock_amount: u64,
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
        // сохраняем seed (8 байт) — используем unlock_amount.to_le_bytes()
        deposit.lock_seed = unlock_amount.to_le_bytes();
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

        // Для события используем поле unlock_amount, записываем его в поле unlock_timestamp=0
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

        // Увеличиваем сумму депозита
        // Проверку на переполнение делаем явно
        let new_amount = ctx.accounts.deposit.amount
            .checked_add(additional_amount)
            .ok_or(ErrorCode::Overflow)?;
        ctx.accounts.deposit.amount = new_amount;

        // Переводим дополнительные токены в vault
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

        // Проверка условия разблокировки в зависимости от типа
        match ctx.accounts.deposit.lock_condition.condition_type {
            ConditionType::ByTime => {
                require!(
                    current_timestamp >= ctx.accounts.deposit.lock_condition.unlock_timestamp,
                    ErrorCode::ConditionsNotMet
                );
            }
            ConditionType::ByAmount => {
                // разблокировка по сумме: если накопленная сумма депозита >= требуемой
                require!(
                    ctx.accounts.deposit.amount >= ctx.accounts.deposit.lock_condition.unlock_amount,
                    ErrorCode::ConditionsNotMet
                );
            }
        }

        // Сохраняем значения перед изменением
        let owner = ctx.accounts.deposit.owner;
        let amount = ctx.accounts.deposit.amount;
        let mint = ctx.accounts.deposit.mint;

        let seeds = &[
            b"deposit",
            ctx.accounts.deposit.owner.as_ref(),
            &ctx.accounts.deposit.lock_seed,
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

        // После успешного вывода обнуляем сумму и ставим статус Withdrawn
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

//
// ────────────────────────────────────────────────
//   СТРУКТУРЫ И КОНТЕКСТЫ
// ────────────────────────────────────────────────
//

#[account]
#[derive(InitSpace)]
pub struct TimeLockDeposit {
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub vault_token_account: Pubkey,
    pub amount: u64,
    pub lock_condition: LockCondition,
    pub lock_seed: [u8; 8], // UNIFIED seed (timestamp or amount bytes)
    pub state: DepositState,
    pub created_at: i64,
    pub bump: u8,
}

/// Условие блокировки (включает оба варианта)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct LockCondition {
    // Используется, если condition_type == ByTime
    pub unlock_timestamp: i64,
    // Используется, если condition_type == ByAmount
    pub unlock_amount: u64,
    pub condition_type: ConditionType,
}

/// Тип условия (ByTime или ByAmount)
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
#[instruction(amount: u64, unlock_timestamp: i64)]
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
            &unlock_timestamp.to_le_bytes()
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
#[instruction(amount: u64, unlock_amount: u64)]
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
            &unlock_amount.to_le_bytes()
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

/// Контекст докидывания токенов
#[derive(Accounts)]
pub struct AddFunds<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [
            b"deposit",
            deposit.owner.as_ref(),
            &deposit.lock_seed
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

/// Контекст вывода
#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        close = owner,
        seeds = [b"deposit", deposit.owner.as_ref(), &deposit.lock_seed],
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

//
// ────────────────────────────────────────────────
//   СОБЫТИЯ (TransactionRecord)
// ────────────────────────────────────────────────
//

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

//
// ────────────────────────────────────────────────
//   ОШИБКИ
// ────────────────────────────────────────────────
//

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