// ============================================
//  DESTINATION REGISTRY
// ============================================
// Resolve qual adapter usar pra cada partner + tipo de destino.

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DestinationAdapter, DestinationType } from './destination.interface';
import { MockStockBroker } from './mock-providers/mock-stock-broker';
import { MockFundDistributor } from './mock-providers/mock-fund-distributor';
import { MockCryptoExchange } from './mock-providers/mock-crypto-exchange';
import { MockBankTransfer } from './mock-providers/mock-bank-transfer';
import { MockRetailer } from './mock-providers/mock-retailer';
import { ShopifyAdapter } from './providers/shopify-adapter';
import { WooCommerceAdapter } from './providers/woocommerce-adapter';
import { MercadoLivreAdapter } from './providers/mercado-livre-adapter';
import { MagaluAdapter } from './providers/magalu-adapter';
import { NubankOpenFinanceAdapter } from './providers/nubank-openfinance-adapter';
import { VtexAdapter } from './providers/vtex-adapter';
import { IFoodAdapter } from './providers/ifood-adapter';
import { RappiAdapter } from './providers/rappi-adapter';

export interface PartnerDestinationConfig {
  partnerId: string;
  stockAdapter?: string;
  fundAdapter?: string;
  cryptoAdapter?: string;
  bankAdapter?: string;
  retailerAdapter?: string;
  billAdapter?: string;
  insuranceAdapter?: string;
}

@Injectable()
export class DestinationRegistry implements OnModuleInit {
  private readonly logger = new Logger(DestinationRegistry.name);
  private adapters = new Map<string, DestinationAdapter>();
  private partnerConfigs = new Map<string, PartnerDestinationConfig>();

  constructor(
    private mockStock: MockStockBroker,
    private mockFund: MockFundDistributor,
    private mockCrypto: MockCryptoExchange,
    private mockBank: MockBankTransfer,
    private mockRetailer: MockRetailer,
    private shopify: ShopifyAdapter,
    private woocommerce: WooCommerceAdapter,
    private mercadoLivre: MercadoLivreAdapter,
    private magalu: MagaluAdapter,
    private nubank: NubankOpenFinanceAdapter,
    private vtex: VtexAdapter,
    private ifood: IFoodAdapter,
    private rappi: RappiAdapter
  ) {
    this.registerDefaultAdapters();
  }

  onModuleInit() {
    this.registerRealAdapters();
  }

  private registerDefaultAdapters() {
    this.adapters.set('MOCK_STOCK_BROKER', this.mockStock);
    this.adapters.set('MOCK_FUND_DISTRIBUTOR', this.mockFund);
    this.adapters.set('MOCK_CRYPTO_EXCHANGE', this.mockCrypto);
    this.adapters.set('MOCK_BANK_ACCOUNT', this.mockBank);
    this.adapters.set('MOCK_RETAILER', this.mockRetailer);
    this.logger.log(`✅ Registered ${this.adapters.size} default mock adapters`);
  }

  private registerRealAdapters() {
    this.adapters.set('SHOPIFY', this.shopify);
    this.adapters.set('WOOCOMMERCE', this.woocommerce);
    this.adapters.set('MERCADO_LIVRE', this.mercadoLivre);
    this.adapters.set('MAGALU', this.magalu);
    this.adapters.set('NUBANK_OPEN_FINANCE', this.nubank);
    this.adapters.set('VTEX', this.vtex);
    this.adapters.set('IFOOD', this.ifood);
    this.adapters.set('RAPPI', this.rappi);
    this.logger.log(`✅ Registered ${this.adapters.size} adapters total (mock + real)`);
  }

  // Registra config de um partner (chamado na inicialização)
  registerPartnerConfig(config: PartnerDestinationConfig) {
    this.partnerConfigs.set(config.partnerId, config);
    this.logger.log(`📋 Registered config for partner ${config.partnerId}`);
  }

  // Resolve qual adapter usar
  resolve(partnerId: string, destinationType: DestinationType): DestinationAdapter {
    const config = this.partnerConfigs.get(partnerId);
    if (!config) {
      this.logger.warn(`No config for partner ${partnerId}, using default mock`);
      return this.getDefaultMock(destinationType);
    }

    const adapterName = this.pickAdapterName(config, destinationType);
    const adapter = this.adapters.get(adapterName);
    if (!adapter) {
      this.logger.warn(`Adapter ${adapterName} not found, using default mock`);
      return this.getDefaultMock(destinationType);
    }
    return adapter;
  }

  // Registra adapter customizado (chamado por módulos de integração real)
  registerCustomAdapter(name: string, adapter: DestinationAdapter) {
    this.adapters.set(name, adapter);
    this.logger.log(`🔌 Registered custom adapter: ${name}`);
  }

  // Lista adapters disponíveis
  listAvailable(): string[] {
    return Array.from(this.adapters.keys());
  }

  private pickAdapterName(config: PartnerDestinationConfig, type: DestinationType): string {
    switch (type) {
      case 'STOCK_BROKER': return config.stockAdapter || 'MOCK_STOCK_BROKER';
      case 'FUND_DISTRIBUTOR': return config.fundAdapter || 'MOCK_FUND_DISTRIBUTOR';
      case 'CRYPTO_EXCHANGE': return config.cryptoAdapter || 'MOCK_CRYPTO_EXCHANGE';
      case 'BANK_ACCOUNT': return config.bankAdapter || 'MOCK_BANK_ACCOUNT';
      case 'RETAILER': return config.retailerAdapter || 'MOCK_RETAILER';
      case 'BILL_PAYER': return config.billAdapter || 'MOCK_BANK_ACCOUNT';
      case 'INSURER': return config.insuranceAdapter || 'MOCK_BANK_ACCOUNT';
      default: return 'MOCK_BANK_ACCOUNT';
    }
  }

  private getDefaultMock(type: DestinationType): DestinationAdapter {
    switch (type) {
      case 'STOCK_BROKER': return this.mockStock;
      case 'FUND_DISTRIBUTOR': return this.mockFund;
      case 'CRYPTO_EXCHANGE': return this.mockCrypto;
      case 'BANK_ACCOUNT': return this.mockBank;
      case 'RETAILER': return this.mockRetailer;
      default: return this.mockBank;
    }
  }
}
