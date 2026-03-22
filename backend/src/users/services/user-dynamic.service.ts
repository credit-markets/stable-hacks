import {
  Injectable,
  Logger,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
enum WalletType {
  Solana = 'Solana',
  Email = 'Email',
}
import { logError } from '../../common/utils';

export interface DynamicUser {
  id: string;
  email?: string;
  verifiedCredentials: Array<{
    address: string;
    chain: string;
  }>;
}

export interface DynamicWallet {
  address: string;
  chain: string;
  walletName?: string;
  walletProvider?: string;
}

interface DynamicApiResponse<T> {
  user: T;
}

/**
 * Service responsible for Dynamic API integrations
 */
@Injectable()
export class UserDynamicService {
  private readonly logger = new Logger(UserDynamicService.name);
  private readonly dynamicToken: string;
  private readonly dynamicApi: string;
  private readonly dynamicEnvId: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.dynamicToken = this.configService.getOrThrow<string>('DYNAMIC_TOKEN');
    this.dynamicApi = this.configService.getOrThrow<string>('DYNAMIC_API');
    this.dynamicEnvId = this.configService.getOrThrow<string>(
      'DYNAMIC_ENVIRONMENT_ID',
    );
  }

  /**
   * Create a new user in Dynamic
   */
  async createDynamicUser(
    email?: string,
  ): Promise<{ userId: string; user: DynamicUser }> {
    try {
      const dynamicUserData = email ? { email } : {};

      const createUserUrl = `${this.dynamicApi}/environments/${this.dynamicEnvId}/users`;
      const response = await firstValueFrom(
        this.httpService
          .post(createUserUrl, dynamicUserData, {
            headers: {
              Authorization: `Bearer ${this.dynamicToken}`,
              'Content-Type': 'application/json',
            },
          })
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error(
                `Error creating user in Dynamic: ${error.message}`,
                error.stack,
              );

              const errorCode =
                error?.response?.data &&
                typeof error.response.data === 'object' &&
                'code' in error.response.data &&
                typeof error.response.data.code === 'string'
                  ? error.response.data.code
                  : '';
              const alreadyRegistered =
                errorCode.includes('already_exists') ||
                errorCode.includes('already_registered');

              if (alreadyRegistered) {
                throw new ConflictException('Email already registered');
              }

              throw new InternalServerErrorException(
                `Failed to create user in Dynamic: ${error.message}`,
              );
            }),
          ),
      );

      const apiResponse = response.data as DynamicApiResponse<DynamicUser>;
      return {
        userId: apiResponse.user.id,
        user: apiResponse.user,
      };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      logError(this.logger, 'Unexpected error in createDynamicUser', error);
      throw new InternalServerErrorException('Failed to create Dynamic user');
    }
  }

  /**
   * Create an embedded wallet for a Dynamic user
   */
  async createEmbeddedWallet(
    dynamicUserId: string,
  ): Promise<{ address: string; user: DynamicUser }> {
    try {
      const createWalletUrl = `${this.dynamicApi}/environments/${this.dynamicEnvId}/embeddedWallets`;
      const createWalletData = {
        type: 'id',
        identifier: dynamicUserId,
        chain: 'SOL',
      };

      const response = await firstValueFrom(
        this.httpService
          .post(createWalletUrl, createWalletData, {
            headers: {
              Authorization: `Bearer ${this.dynamicToken}`,
              'Content-Type': 'application/json',
            },
          })
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error(
                `Error creating embedded wallet in Dynamic: ${error.message}`,
                error.stack,
              );
              throw new InternalServerErrorException(
                `Failed to create embedded wallet: ${error.message}`,
              );
            }),
          ),
      );

      const apiResponse = response.data as DynamicApiResponse<DynamicUser>;
      const walletAddress = apiResponse.user.verifiedCredentials[0].address;
      return {
        address: walletAddress,
        user: apiResponse.user,
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      logError(this.logger, 'Unexpected error in createEmbeddedWallet', error);
      throw new InternalServerErrorException(
        'Failed to create embedded wallet',
      );
    }
  }

  /**
   * Link an EOA wallet to a Dynamic user
   */
  async linkEOAWallet(
    dynamicUserId: string,
    walletAddress: string,
  ): Promise<DynamicWallet> {
    try {
      const linkWalletUrl = `${this.dynamicApi}/users/${dynamicUserId}/wallets`;
      const linkWalletData = {
        publicWalletAddress: walletAddress,
        chain: 'SOL',
        walletName: 'Phantom',
        walletProvider: 'browserExtension',
      };

      const response = await firstValueFrom(
        this.httpService
          .post(linkWalletUrl, linkWalletData, {
            headers: {
              Authorization: `Bearer ${this.dynamicToken}`,
              'Content-Type': 'application/json',
            },
          })
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error(
                `Error linking EOA wallet in Dynamic: ${error.message}`,
                error.stack,
              );
              throw new InternalServerErrorException(
                `Failed to link EOA wallet: ${error.message}`,
              );
            }),
          ),
      );

      return response.data as DynamicWallet;
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      logError(this.logger, 'Unexpected error in linkEOAWallet', error);
      throw new InternalServerErrorException('Failed to link EOA wallet');
    }
  }

  /**
   * Create a wallet for a user based on wallet type
   */
  async createWallet(
    walletType: WalletType,
    data: string,
  ): Promise<{
    dynamicUserId: string;
    address: string;
    email?: string;
  }> {
    switch (walletType) {
      case WalletType.Email: {
        // Create user with email and embedded wallet
        const { userId } = await this.createDynamicUser(data);
        const { address } = await this.createEmbeddedWallet(userId);
        return {
          dynamicUserId: userId,
          address,
          email: data,
        };
      }

      case WalletType.Solana: {
        // Create user without email and link wallet
        const { userId: eoaUserId } = await this.createDynamicUser();
        await this.linkEOAWallet(eoaUserId, data);
        return {
          dynamicUserId: eoaUserId,
          address: data,
        };
      }

      default: {
        const exhaustiveCheck: never = walletType;
        throw new InternalServerErrorException(
          `Unsupported wallet type: ${String(exhaustiveCheck)}`,
        );
      }
    }
  }

  /**
   * Delete a wallet from Dynamic user
   */
  async deleteWallet(dynamicUserId: string, walletId: string): Promise<void> {
    try {
      const deleteWalletUrl = `${this.dynamicApi}/users/${dynamicUserId}/wallets/${walletId}`;
      await firstValueFrom(
        this.httpService
          .delete(deleteWalletUrl, {
            headers: {
              Authorization: `Bearer ${this.dynamicToken}`,
            },
          })
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error(
                `Error deleting wallet from Dynamic: ${error.message}`,
                error.stack,
              );
              throw new InternalServerErrorException(
                `Failed to delete wallet from Dynamic: ${error.message}`,
              );
            }),
          ),
      );
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      logError(this.logger, 'Unexpected error in deleteWallet', error);
      throw new InternalServerErrorException(
        'Failed to delete wallet from Dynamic',
      );
    }
  }
}
