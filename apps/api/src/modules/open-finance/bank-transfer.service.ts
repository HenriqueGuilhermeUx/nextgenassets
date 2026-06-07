// ============================================
//  BANK TRANSFER SERVICE (Open Finance Mock + Efí)
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { DestinationRegistry } from '../destinations/destination-registry';

@Injectable()
export class BankTransferService {
  private readonly logger = new Logger(BankTransferService.name);

  constructor(private destinations: DestinationRegistry) {}

  async getBalance(userId: string): Promise<number> {
    const bank = this.destinations.resolve('default', 'BANK_ACCOUNT') as any;
    if (bank.getBalance) {
      const result = await bank.getBalance(userId);
      return result?.balance || 0;
    }
    return 0;
  }

  async initiatePix(userId: string, amountBrl: number, destinationAccount: string): Promise<any> {
    const bank = this.destinations.resolve('default', 'BANK_ACCOUNT') as any;
    return bank.execute({
      type: 'TRANSFER',
      userId,
      amountBrl,
      destinationAccount
    });
  }

  async creditMockAccount(userId: string, amountBrl: number, source: string) {
    const bank = this.destinations.resolve('default', 'BANK_ACCOUNT') as any;
    if (bank.creditAccount) {
      return bank.creditAccount(userId, amountBrl, source);
    }
  }
}
