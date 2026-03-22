import type { Idl } from '@coral-xyz/anchor';
import * as svs11Idl from './svs_11.json';
import * as mockOracleIdl from './mock_oracle.json';
import * as mockSasIdl from './mock_sas.json';

export const SVS11_IDL: Idl = svs11Idl as unknown as Idl;
export const MOCK_ORACLE_IDL: Idl = mockOracleIdl as unknown as Idl;
export const MOCK_SAS_IDL: Idl = mockSasIdl as unknown as Idl;

export type Svs11 = typeof svs11Idl;
export type MockOracle = typeof mockOracleIdl;
export type MockSas = typeof mockSasIdl;
