/**
 * Subscription Feature — Type Definitions
 *
 * Covers: Subscription Plans, Products, Features, SKU, Pricing, Offers
 */

// ── API Raw Shapes (matches API response structure) ──────────────────────────

export interface SubscriptionOfferPricingShape {
  nPrice: number;
  sCurrency: string;
  sCurrencySymbol: string;
}

export interface SubscriptionOfferTranslationShape {
  sOfferTagName: string;
  sFooterNote: string;
  sOfferDisclaimer: string;
}

export interface SubscriptionOfferShape {
  sOfferId: string;
  nValidityCount: number;
  sValidityDuration: string;
  oOfferTranslation: SubscriptionOfferTranslationShape;
  oOfferPricing: SubscriptionOfferPricingShape;
  sProviderOfferId: string;
}

export interface SubscriptionSkuPricingShape {
  nPrice: number;
  sCurrency: string;
  sCurrencySymbol: string;
}

export interface SubscriptionProviderSkuShape {
  sUniqueSkuId: string;
  sPaymentProviderId: string;
  sProviderSkuId: string;
  sProviderSkuLabel: string;
  oPricing: SubscriptionSkuPricingShape;
  oOfferDetails: SubscriptionOfferShape | null;
}

export interface SubscriptionFeatureShape {
  sFeatureId: string;
  eFeatureType: string;
  vFeatureValue: string | number | boolean;
  sFeatureImageUrl: string;
  sFeatureName: string;
}

export interface SubscriptionProductTranslationShape {
  sDescription: string;
  sName: string;
  sTitle: string;
}

export interface SubscriptionProductShape {
  sSubProductLabel: string;
  sProductId: string;
  sValidityDuration: string;
  nValidityCount: number;
  nValidityDays: number;
  bShowPriceComparison: boolean;
  nDisplayMarkupPercent: number;
  oProductTranslation: SubscriptionProductTranslationShape;
  aFeatures: SubscriptionFeatureShape[];
  aProviderSkus: SubscriptionProviderSkuShape[];
  sPriceDisplayNote: string;
}

export interface SubscriptionGroupTranslationShape {
  sDescription: string;
  sName: string;
  sTitle: string;
}

export interface SubscriptionGroupShape {
  sGroupId: string;
  sNote: string;
  oGroupTranslation: SubscriptionGroupTranslationShape;
  aSubscriptionProducts: SubscriptionProductShape[];
  sProjectId: string;
}

export interface SubscriptionAllPlansApiShape {
  aAllSubscriptionPlans: SubscriptionGroupShape[];
  sFooterNote: string;
  sHeaderMediaURL: string;
}

// ── Mapped / UI-friendly types ───────────────────────────────────────────────

export interface SubscriptionFeature {
  featureId: string;
  featureType: string;
  featureValue: string | number | boolean;
  featureImageUrl: string;
  featureName: string;
}

export interface SubscriptionOffer {
  offerId: string;
  validityCount: number;
  validityDuration: string;
  tagName: string;
  footerNote: string;
  disclaimer: string;
  price: number;
  currency: string;
  currencySymbol: string;
  providerOfferId: string;
}

export interface SubscriptionSku {
  uniqueSkuId: string;
  paymentProviderId: string;
  providerSkuId: string;
  providerSkuLabel: string;
  price: number;
  currency: string;
  currencySymbol: string;
  offer: SubscriptionOffer | null;
}

export interface SubscriptionProduct {
  productId: string;
  label: string;
  name: string;
  title: string;
  description: string;
  validityDuration: string;
  validityCount: number;
  validityDays: number;
  showPriceComparison: boolean;
  displayMarkupPercent: number;
  features: SubscriptionFeature[];
  skus: SubscriptionSku[];
  priceDisplayNote: string;
}

export interface SubscriptionGroup {
  groupId: string;
  note: string;
  name: string;
  title: string;
  description: string;
  products: SubscriptionProduct[];
  projectId: string;
}

export interface SubscriptionAllPlans {
  groups: SubscriptionGroup[];
  footerNote: string;
  headerMediaUrl: string;
}
