// ============================================
//  MARKET DATA SERVICE
// ============================================
// Cotações e histórico de preços (Yahoo Finance, CoinGecko, mock)

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);
  private cache = new Map<string, { data: any; expiresAt: number }>();
  private readonly CACHE_TTL = 60_000; // 1 min

  async getStockQuote(ticker: string): Promise<{ price: number; currency: string; timestamp: Date } | null> {
    const cached = this.getCached(`stock:${ticker}`);
    if (cached) return cached;

    const yahooTicker = ticker.endsWith('.SA') ? ticker : `${ticker}.SA`;
    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=1d&range=1d`
      );
      const data = await response.json();
      const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (price) {
        const result = { price, currency: 'BRL', timestamp: new Date() };
        this.setCache(`stock:${ticker}`, result);
        return result;
      }
    } catch (err) {
      this.logger.warn(`Yahoo Finance falhou pra ${ticker}, usando mock`);
    }

    // Fallback mock
    const mockPrices: Record<string, number> = {
      ITUB4: 33.50, PETR4: 38.20, VALE3: 62.40, BBAS3: 27.80,
      BBDC4: 14.20, ABEV3: 13.95, WEGE3: 38.10, MGLU3: 8.45
    };
    return { price: mockPrices[ticker] || 25, currency: 'BRL', timestamp: new Date() };
  }

  async getStockHistory(ticker: string, days: number): Promise<{ date: Date; close: number }[]> {
    const yahooTicker = ticker.endsWith('.SA') ? ticker : `${ticker}.SA`;
    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=1d&range=${days}d`
      );
      const data = await response.json();
      const result = data?.chart?.result?.[0];
      if (result) {
        const timestamps = result.timestamp || [];
        const closes = result.indicators?.quote?.[0]?.close || [];
        return timestamps.map((ts: number, i: number) => ({
          date: new Date(ts * 1000),
          close: closes[i] || 0
        })).filter((p: any) => p.close > 0);
      }
    } catch (err) {
      this.logger.warn(`Yahoo history falhou pra ${ticker}`);
    }

    // Mock: gera histórico fictício
    const currentPrice = (await this.getStockQuote(ticker))?.price || 25;
    return Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000),
      close: currentPrice * (1 + (Math.random() - 0.5) * 0.05)
    }));
  }

  async getCryptoQuote(asset: string): Promise<{ price: number; currency: string; timestamp: Date } | null> {
    const geckoIds: Record<string, string> = {
      USDC: 'usd-coin', USDT: 'tether', BTC: 'bitcoin', ETH: 'ethereum', PAXG: 'pax-gold', USDY: 'ondo-us-dollar-yield'
    };
    const geckoId = geckoIds[asset] || 'usd-coin';

    try {
      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd`);
      const data = await response.json();
      const price = data?.[geckoId]?.usd;
      if (price) {
        return { price: price * 5.10, currency: 'BRL', timestamp: new Date() };  // converte pra BRL
      }
    } catch (err) {
      this.logger.warn(`CoinGecko falhou pra ${asset}`);
    }

    return { price: 1, currency: 'BRL', timestamp: new Date() };
  }

  async getCryptoHistory(asset: string, hours: number): Promise<{ date: Date; close: number }[]> {
    const currentPrice = (await this.getCryptoQuote(asset))?.price || 1;
    return Array.from({ length: hours }, (_, i) => ({
      date: new Date(Date.now() - (hours - i) * 60 * 60 * 1000),
      close: currentPrice * (1 + (Math.random() - 0.5) * 0.03)
    }));
  }

  async getProductQuote(sku: string): Promise<{ price: number; currency: string; timestamp: Date } | null> {
    // Em produção, consultaria APIs de varejistas
    const mockProducts: Record<string, number> = {
      BISCOITO_Z_150G: 6.20, CAFE_X_500G: 18.90, LEITE_INTEGRAL_1L: 5.80,
      TV_50_4K_SAMSUNG: 2499, NOTEBOOK_GAMER_X: 5499, LIVRO_X: 49.90
    };
    return { price: mockProducts[sku] || 0, currency: 'BRL', timestamp: new Date() };
  }

  // ========== Cache helpers ==========

  private getCached(key: string): any {
    const entry = this.cache.get(key);
    if (entry && entry.expiresAt > Date.now()) return entry.data;
    return null;
  }

  private setCache(key: string, data: any) {
    this.cache.set(key, { data, expiresAt: Date.now() + this.CACHE_TTL });
  }
}
