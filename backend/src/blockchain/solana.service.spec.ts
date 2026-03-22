import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SolanaService } from './solana.service';
import { PublicKey, Keypair } from '@solana/web3.js';
import { vaultIdToBytes } from './solana-config';

// Mock @coral-xyz/anchor to avoid needing a real IDL parse + RPC connection
const mockProgramId = Keypair.generate().publicKey;
jest.mock('@coral-xyz/anchor', () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const actual = jest.requireActual('@coral-xyz/anchor');
  return {
    ...(actual as Record<string, unknown>),
    Program: jest.fn().mockImplementation(() => ({
      programId: mockProgramId,
      account: {},
    })),
    AnchorProvider: jest.fn().mockImplementation(() => ({})),
    Wallet: jest.fn().mockImplementation(() => ({})),
  };
});

describe('SolanaService', () => {
  let service: SolanaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SolanaService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'SOLANA_RPC_URL')
                return 'https://api.devnet.solana.com';
              if (key === 'SOLANA_PROGRAM_ID') return mockProgramId.toBase58();
              return undefined;
            }),
            getOrThrow: jest.fn((key: string) => {
              if (key === 'SOLANA_PROGRAM_ID') return mockProgramId.toBase58();
              throw new Error(`Missing config: ${key}`);
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SolanaService>(SolanaService);
    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should derive vault PDA deterministically', () => {
    const assetMint = Keypair.generate().publicKey;
    const vaultId = 42;
    const pda = service.getVaultPda(assetMint, vaultId);
    expect(pda).toBeDefined();
    expect(pda).toBeInstanceOf(PublicKey);

    // Same input = same PDA (deterministic)
    const pda2 = service.getVaultPda(assetMint, vaultId);
    expect(pda.toBase58()).toEqual(pda2.toBase58());
  });

  it('should convert vault_id to 8-byte LE buffer', () => {
    const bytes = service.vaultIdToBytes(1);
    expect(bytes.length).toBe(8);
    expect(bytes[0]).toBe(1);
    expect(bytes[1]).toBe(0);
    expect(bytes[7]).toBe(0);
  });

  it('should handle large vault_id values', () => {
    const bytes = vaultIdToBytes(BigInt('18446744073709551615')); // u64 max
    expect(bytes.length).toBe(8);
    // All bytes should be 0xFF for u64 max
    for (let i = 0; i < 8; i++) {
      expect(bytes[i]).toBe(0xff);
    }
  });

  it('should produce different PDAs for different vault IDs', () => {
    const assetMint = Keypair.generate().publicKey;
    const pda1 = service.getVaultPda(assetMint, 1);
    const pda2 = service.getVaultPda(assetMint, 2);
    expect(pda1.toBase58()).not.toEqual(pda2.toBase58());
  });

  it('should produce different PDAs for different asset mints', () => {
    const mint1 = Keypair.generate().publicKey;
    const mint2 = Keypair.generate().publicKey;
    const pda1 = service.getVaultPda(mint1, 1);
    const pda2 = service.getVaultPda(mint2, 1);
    expect(pda1.toBase58()).not.toEqual(pda2.toBase58());
  });
});
