export type PaymentMethodKind='PIX'|'CARD'|'BOLETO';
export type PayoutMode='STANDARD'|'INSTANT';

export type ProviderCapabilities={
  provider:string;
  configured:boolean;
  enabled:boolean;
  methods:PaymentMethodKind[];
  subscriptions:boolean;
  connectedAccounts:boolean;
  splitOrApplicationFee:boolean;
  instantPayouts:boolean;
  refunds:boolean;
  disputes:boolean;
};

export interface PaymentProviderAdapter {
  readonly provider:string;
  capabilities():ProviderCapabilities;
  health():Promise<{ok:boolean;provider:string;configured:boolean;enabled:boolean;livemode?:boolean;accountId?:string|null}>;
}
