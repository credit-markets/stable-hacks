import { Injectable } from '@nestjs/common';
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { BN, Program } from '@coral-xyz/anchor';
import { SolanaService } from '../../blockchain/solana.service';

/**
 * bn.js ships no type declarations so `BN` resolves to `any`.
 * Typed constructor interface matches pattern in pool-deployment.service.ts.
 */
interface BNConstructor {
  new (value: number | string): { toNumber(): number; toString(): string };
}
const TypedBN = BN as unknown as BNConstructor;

/**
 * Anchor's untyped `Program` returns `any` from `.methods` chains.
 * These helpers isolate the unsafe boundary so callers work with concrete types.
 */
async function buildCreateAttestationIx(
  program: Program,
  args: {
    authority: PublicKey;
    attestationPda: PublicKey;
    subject: PublicKey;
    countryBytes: number[];
    expiresAt: number;
  },
): Promise<TransactionInstruction> {
  return program.methods
    .createAttestation(
      args.authority,
      0, // attestation_type: KYB
      args.countryBytes,
      new TypedBN(args.expiresAt),
    )
    .accounts({
      authority: args.authority,
      attestation: args.attestationPda,
      subject: args.subject,
    })
    .instruction();
}

async function buildRevokeAttestationIx(
  program: Program,
  args: {
    authority: PublicKey;
    attestationPda: PublicKey;
  },
): Promise<TransactionInstruction> {
  return program.methods
    .revokeAttestation()
    .accounts({
      authority: args.authority,
      attestation: args.attestationPda,
    })
    .instruction();
}

@Injectable()
export class KybOnchainService {
  constructor(private readonly solanaService: SolanaService) {}

  deriveAttestationPda(authority: PublicKey, subject: PublicKey): PublicKey {
    return this.solanaService.getAttestationPda(authority, subject);
  }

  async buildAttestationTx(params: {
    attesterWallet: string;
    investorWallet: string;
    jurisdiction: string;
  }): Promise<{ transaction: string; attestationPda: string }> {
    const authority = new PublicKey(params.attesterWallet);
    const subject = new PublicKey(params.investorWallet);
    const attestationPda = this.deriveAttestationPda(authority, subject);

    const program = this.solanaService.getMockSasProgram();
    const countryBytes = [
      params.jurisdiction.charCodeAt(0),
      params.jurisdiction.charCodeAt(1),
    ];
    const expiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

    const ix = await buildCreateAttestationIx(program, {
      authority,
      attestationPda,
      subject,
      countryBytes,
      expiresAt,
    });

    const tx = new Transaction().add(ix);
    const { blockhash } = await this.solanaService
      .getConnection()
      .getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = authority;

    return {
      transaction: tx
        .serialize({ requireAllSignatures: false })
        .toString('base64'),
      attestationPda: attestationPda.toBase58(),
    };
  }

  async buildRevokeTx(params: {
    attesterWallet: string;
    investorWallet: string;
  }): Promise<{ transaction: string }> {
    const authority = new PublicKey(params.attesterWallet);
    const subject = new PublicKey(params.investorWallet);
    const attestationPda = this.deriveAttestationPda(authority, subject);

    const program = this.solanaService.getMockSasProgram();

    const ix = await buildRevokeAttestationIx(program, {
      authority,
      attestationPda,
    });

    const tx = new Transaction().add(ix);
    const { blockhash } = await this.solanaService
      .getConnection()
      .getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = authority;

    return {
      transaction: tx
        .serialize({ requireAllSignatures: false })
        .toString('base64'),
    };
  }

  async checkAttestationExists(
    attesterWallet: string,
    investorWallet: string,
  ): Promise<boolean> {
    const authority = new PublicKey(attesterWallet);
    const subject = new PublicKey(investorWallet);
    const pda = this.deriveAttestationPda(authority, subject);

    const accountInfo = await this.solanaService
      .getConnection()
      .getAccountInfo(pda);
    return accountInfo !== null;
  }
}
