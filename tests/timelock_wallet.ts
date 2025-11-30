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

let counter = 0;
const nextCounter = () => counter++;

describe("TimeLock Wallet — unlock by time", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.TimelockWallet as Program<TimelockWallet>;
  const wallet = provider.wallet as anchor.Wallet;

  let mint: PublicKey;
  let ownerTokenAccount: PublicKey;
  let vaultTokenAccount: PublicKey;
  let depositPda: PublicKey;

  const LOCK_DURATION = 4;

  before(async () => {
    mint = await createMint(provider.connection, wallet.payer, wallet.publicKey, null, 6);
    const ata = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      wallet.payer,
      mint,
      wallet.publicKey
    );
    ownerTokenAccount = ata.address;
    await mintTo(provider.connection, wallet.payer, mint, ownerTokenAccount, wallet.payer, 10_000_000_000n);
  });

  it("Initializes a new deposit (by time)", async () => {
    const unlockTimestamp = Math.floor(Date.now() / 1000) + LOCK_DURATION;
    const c = nextCounter();

    [depositPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("deposit"),
        wallet.publicKey.toBuffer(),
        new anchor.BN(unlockTimestamp).toArrayLike(Buffer, "le", 8),
        new anchor.BN(c).toArrayLike(Buffer, "le", 4),
      ],
      program.programId
    );

    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), depositPda.toBuffer()],
      program.programId
    );
    vaultTokenAccount = vaultPda;

    await program.methods
      .initializeDeposit(new anchor.BN(500_000_000), new anchor.BN(unlockTimestamp), c)
      .accounts({
        deposit: depositPda,
        mint,
        ownerTokenAccount,
        vaultTokenAccount,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const acc = await program.account.timeLockDeposit.fetch(depositPda);
    assert.equal(acc.amount.toNumber(), 500_000_000);
  });

  it("Adds funds to the active deposit", async () => {
    await program.methods.addFunds(new anchor.BN(200_000_000))
      .accounts({
        deposit: depositPda,
        mint,
        ownerTokenAccount,
        vaultTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const acc = await program.account.timeLockDeposit.fetch(depositPda);
    assert.equal(acc.amount.toNumber(), 700_000_000);
  });

  it("Rejects withdrawal before unlock time", async () => {
    try {
      await program.methods.withdraw().accounts({
        deposit: depositPda,
        vaultTokenAccount,
        ownerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      }).rpc();
      assert.fail();
    } catch (err: any) {
      assert.include(err.message, "ConditionsNotMet");
    }
  });

  it("Withdraws successfully after unlock time", async () => {
    console.log(`Waiting ${LOCK_DURATION + 1} seconds...`);
    await new Promise(r => setTimeout(r, (LOCK_DURATION + 1) * 1000));

    await program.methods.withdraw().accounts({
      deposit: depositPda,
      vaultTokenAccount,
      ownerTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    }).rpc();
  });
});

describe("TimeLock Wallet — unlock by amount", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.TimelockWallet as Program<TimelockWallet>;
  const wallet = provider.wallet as anchor.Wallet;

  let mint: PublicKey;
  let ownerTokenAccount: PublicKey;
  let vaultTokenAccount: PublicKey;
  let depositPda: PublicKey;

  const UNLOCK_AMOUNT = new anchor.BN(1_500_000_000);
  const INITIAL_DEPOSIT = new anchor.BN(400_000_000);
  const c = nextCounter(); // будет 2, 3, 4... — всегда уникально

  before(async () => {
    mint = await createMint(provider.connection, wallet.payer, wallet.publicKey, null, 6);
    const ata = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      wallet.payer,
      mint,
      wallet.publicKey
    );
    ownerTokenAccount = ata.address;
    await mintTo(provider.connection, wallet.payer, mint, ownerTokenAccount, wallet.payer, 10_000_000_000n);
  });

  it("Initializes deposit with amount-based unlock", async () => {
    [depositPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("deposit"),
        wallet.publicKey.toBuffer(),
        UNLOCK_AMOUNT.toArrayLike(Buffer, "le", 8),
        new anchor.BN(c).toArrayLike(Buffer, "le", 4),
      ],
      program.programId
    );

    [vaultTokenAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), depositPda.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeDepositByAmount(INITIAL_DEPOSIT, UNLOCK_AMOUNT, c)
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

    const acc = await program.account.timeLockDeposit.fetch(depositPda);
    assert.equal(acc.amount.toNumber(), 400_000_000);
    assert.ok(acc.lockCondition.conditionType.byAmount !== undefined);
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
      assert.fail("Should have failed");
    } catch (err: any) {
      assert.include(err.message, "ConditionsNotMet");
    }
  });

  it("Adds funds to reach unlock amount + withdraw", async () => {
    const depositAcc = await program.account.timeLockDeposit.fetch(depositPda);
    const missing = UNLOCK_AMOUNT.sub(depositAcc.amount);

    await program.methods
      .addFunds(missing)
      .accounts({
        owner: wallet.publicKey,
        deposit: depositPda,
        mint,
        ownerTokenAccount,
        vaultTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const finalAcc = await program.account.timeLockDeposit.fetch(depositPda);
    assert.ok(finalAcc.amount.eq(UNLOCK_AMOUNT));

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

    // Проверяем, что аккаунт закрыт
    const closed = await program.account.timeLockDeposit.fetchNullable(depositPda);
    assert.strictEqual(closed, null);
  });
});