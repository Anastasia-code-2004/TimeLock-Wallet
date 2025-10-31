import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert } from "chai";
import { TimelockWallet } from "../target/types/timelock_wallet";

describe("🕒 TimeLock Wallet — unlock by time", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.TimelockWallet as Program<TimelockWallet>;
  const wallet = provider.wallet as anchor.Wallet;

  let mint: PublicKey;
  let ownerTokenAccount: PublicKey;
  let vaultTokenAccount: PublicKey;
  let depositPda: PublicKey;
  let bump: number;

  const LOCK_DURATION = 3; // seconds

  before(async () => {
    console.log("🔧 Setting up test environment...");

    mint = await createMint(
      provider.connection,
      wallet.payer,
      wallet.publicKey,
      null,
      6
    );

    const ownerToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      wallet.payer,
      mint,
      wallet.publicKey
    );
    ownerTokenAccount = ownerToken.address;

    await mintTo(
      provider.connection,
      wallet.payer,
      mint,
      ownerTokenAccount,
      wallet.payer,
      1_000_000_000
    );
  });

  it("Initializes a new deposit", async () => {
    const now = Math.floor(Date.now() / 1000);
    const unlockTimestamp = now + LOCK_DURATION;

    [depositPda, bump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("deposit"),
        wallet.publicKey.toBuffer(),
        new anchor.BN(unlockTimestamp).toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), depositPda.toBuffer()],
      program.programId
    );
    vaultTokenAccount = vaultPda;

    await program.methods
      .initializeDeposit(new anchor.BN(500_000_000), new anchor.BN(unlockTimestamp))
      .accounts({
        owner: wallet.publicKey,
        deposit: depositPda,
        mint,
        ownerTokenAccount,
        vaultTokenAccount,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const deposit = await program.account.timeLockDeposit.fetch(depositPda);
    assert.equal(deposit.amount.toNumber(), 500_000_000);
    assert.deepEqual(deposit.state, { active: {} });
    console.log("✅ Deposit initialized");
  });

  it("Adds funds to the active deposit", async () => {
    await program.methods
      .addFunds(new anchor.BN(200_000_000))
      .accounts({
        owner: wallet.publicKey,
        deposit: depositPda,
        mint,
        ownerTokenAccount,
        vaultTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const deposit = await program.account.timeLockDeposit.fetch(depositPda);
    assert.equal(deposit.amount.toNumber(), 700_000_000);
    console.log("✅ Funds added successfully");
  });

  it("Rejects withdrawal before unlock time", async () => {
    try {
      await program.methods
        .withdraw()
        .accounts({
          owner: wallet.publicKey,
          deposit: depositPda,
          vaultTokenAccount,
          ownerTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      assert.fail("Withdrawal should have failed before unlock time");
    } catch (err) {
      assert.include(err.toString(), "ConditionsNotMet");
      console.log("✅ Withdrawal correctly rejected before unlock time");
    }
  });

  it("Withdraws successfully after unlock time", async () => {
    console.log(`⏳ Waiting ${LOCK_DURATION + 1} seconds for unlock...`);
    await new Promise((r) => setTimeout(r, (LOCK_DURATION + 1) * 1000));

    await program.methods
      .withdraw()
      .accounts({
        owner: wallet.publicKey,
        deposit: depositPda,
        vaultTokenAccount,
        ownerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const deposit = await program.account.timeLockDeposit.fetch(depositPda);
    assert.deepEqual(deposit.state, { withdrawn: {} });
    console.log("✅ Withdrawal successful");
  });

  it("Prevents repeated withdrawal", async () => {
    try {
      await program.methods
        .withdraw()
        .accounts({
          owner: wallet.publicKey,
          deposit: depositPda,
          vaultTokenAccount,
          ownerTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      assert.fail("Should not allow repeated withdrawal");
    } catch (err) {
      assert.include(err.toString(), "NotActive");
      console.log("✅ Repeated withdrawal correctly rejected");
    }
  });
});


// ────────────────────────────────────────────────
// 💰 Новые тесты: разблокировка по сумме (ByAmount)
// ────────────────────────────────────────────────

describe("💰 TimeLock Wallet — unlock by amount", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.TimelockWallet as Program<TimelockWallet>;
  const wallet = provider.wallet as anchor.Wallet;

  let mint: PublicKey;
  let ownerTokenAccount: PublicKey;
  let vaultTokenAccount: PublicKey;
  let depositPda: PublicKey;

  const UNLOCK_AMOUNT = 1_000_000_000; // 1 token (с учётом decimals = 6)

  before(async () => {
    console.log("🔧 Setting up environment for amount-based deposit...");

    mint = await createMint(
      provider.connection,
      wallet.payer,
      wallet.publicKey,
      null,
      6
    );

    const ownerToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      wallet.payer,
      mint,
      wallet.publicKey
    );
    ownerTokenAccount = ownerToken.address;

    await mintTo(
      provider.connection,
      wallet.payer,
      mint,
      ownerTokenAccount,
      wallet.payer,
      2_000_000_000 // 2 tokens
    );

    // PDA: ["deposit", owner, unlock_amount.to_le_bytes()]
    const unlockAmount = new anchor.BN(UNLOCK_AMOUNT);
    [depositPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("deposit"),
        wallet.publicKey.toBuffer(),
        unlockAmount.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), depositPda.toBuffer()],
      program.programId
    );
    vaultTokenAccount = vaultPda;
  });

  it("Initializes deposit with amount-based unlock", async () => {
    await program.methods
      .initializeDepositByAmount(new anchor.BN(400_000_000), new anchor.BN(UNLOCK_AMOUNT))
      .accounts({
        owner: wallet.publicKey,
        deposit: depositPda,
        mint,
        ownerTokenAccount,
        vaultTokenAccount,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const deposit = await program.account.timeLockDeposit.fetch(depositPda);
    assert.equal(deposit.amount.toNumber(), 400_000_000);
    assert.deepEqual(deposit.state, { active: {} });
    console.log("✅ Deposit (ByAmount) initialized");
  });

  it("Rejects withdrawal before reaching unlock amount", async () => {
    try {
      await program.methods
        .withdraw()
        .accounts({
          owner: wallet.publicKey,
          deposit: depositPda,
          vaultTokenAccount,
          ownerTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      assert.fail("Withdrawal should fail before unlock amount reached");
    } catch (err) {
      assert.include(err.toString(), "ConditionsNotMet");
      console.log("✅ Withdrawal rejected before reaching target amount");
    }
  });

  it("Adds funds to reach unlock amount", async () => {
    await program.methods
      .addFunds(new anchor.BN(600_000_000))
      .accounts({
        owner: wallet.publicKey,
        deposit: depositPda,
        mint,
        ownerTokenAccount,
        vaultTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const deposit = await program.account.timeLockDeposit.fetch(depositPda);
    assert.equal(deposit.amount.toNumber(), 1_000_000_000);
    console.log("✅ Funds added to reach unlock threshold");
  });

  it("Allows withdrawal after reaching unlock amount", async () => {
    await program.methods
      .withdraw()
      .accounts({
        owner: wallet.publicKey,
        deposit: depositPda,
        vaultTokenAccount,
        ownerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const deposit = await program.account.timeLockDeposit.fetch(depositPda);
    assert.deepEqual(deposit.state, { withdrawn: {} });
    console.log("✅ Withdrawal successful after reaching unlock amount");
  });
});