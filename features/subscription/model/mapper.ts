/**
 * Subscription Plans Mapper
 *
 * Maps raw API shapes → UI-friendly models.
 */

import type { ApiResponse } from '@lib/types/api.types';
import type {
  SubscriptionAllPlansApiShape,
  SubscriptionAllPlans,
  SubscriptionGroupShape,
  SubscriptionGroup,
  SubscriptionProductShape,
  SubscriptionProduct,
  SubscriptionFeatureShape,
  SubscriptionFeature,
  SubscriptionProviderSkuShape,
  SubscriptionSku,
  SubscriptionOfferShape,
  SubscriptionOffer,
} from './types';

// ── Feature mapper ──────────────────────────────────────────────

function mapFeature(raw: SubscriptionFeatureShape): SubscriptionFeature {
  return {
    featureId: raw.sFeatureId,
    featureType: raw.eFeatureType,
    featureValue: raw.vFeatureValue,
    featureImageUrl: raw.sFeatureImageUrl,
    featureName: raw.sFeatureName,
  };
}

// ── Offer mapper ────────────────────────────────────────────────

function mapOffer(raw: SubscriptionOfferShape): SubscriptionOffer {
  return {
    offerId: raw.sOfferId,
    validityCount: raw.nValidityCount,
    validityDuration: raw.sValidityDuration,
    tagName: raw.oOfferTranslation.sOfferTagName,
    footerNote: raw.oOfferTranslation.sFooterNote,
    disclaimer: raw.oOfferTranslation.sOfferDisclaimer,
    price: raw.oOfferPricing.nPrice,
    currency: raw.oOfferPricing.sCurrency,
    currencySymbol: raw.oOfferPricing.sCurrencySymbol,
    providerOfferId: raw.sProviderOfferId,
  };
}

// ── SKU mapper ──────────────────────────────────────────────────

function mapSku(raw: SubscriptionProviderSkuShape): SubscriptionSku {
  return {
    uniqueSkuId: raw.sUniqueSkuId,
    paymentProviderId: raw.sPaymentProviderId,
    providerSkuId: raw.sProviderSkuId,
    providerSkuLabel: raw.sProviderSkuLabel,
    price: raw.oPricing.nPrice,
    currency: raw.oPricing.sCurrency,
    currencySymbol: raw.oPricing.sCurrencySymbol,
    offer: raw.oOfferDetails ? mapOffer(raw.oOfferDetails) : null,
  };
}

// ── Product mapper ──────────────────────────────────────────────

function mapProduct(raw: SubscriptionProductShape): SubscriptionProduct {
  return {
    productId: raw.sProductId,
    label: raw.sSubProductLabel,
    name: raw.oProductTranslation.sName,
    title: raw.oProductTranslation.sTitle,
    description: raw.oProductTranslation.sDescription,
    validityDuration: raw.sValidityDuration,
    validityCount: raw.nValidityCount,
    validityDays: raw.nValidityDays,
    showPriceComparison: raw.bShowPriceComparison,
    displayMarkupPercent: raw.nDisplayMarkupPercent,
    features: raw.aFeatures.map(mapFeature),
    skus: raw.aProviderSkus.map(mapSku),
    priceDisplayNote: raw.sPriceDisplayNote,
  };
}

// ── Group mapper ────────────────────────────────────────────────

function mapGroup(raw: SubscriptionGroupShape): SubscriptionGroup {
  return {
    groupId: raw.sGroupId,
    note: raw.sNote,
    name: raw.oGroupTranslation.sName,
    title: raw.oGroupTranslation.sTitle,
    description: raw.oGroupTranslation.sDescription,
    products: raw.aSubscriptionProducts.map(mapProduct),
    projectId: raw.sProjectId,
  };
}

// ── Root mapper ─────────────────────────────────────────────────

export function mapSubscriptionAllPlans(
  response: ApiResponse<SubscriptionAllPlansApiShape>
): SubscriptionAllPlans {
  const data = response.data;

  if (!data) {
    return { groups: [], footerNote: '', headerMediaUrl: '' };
  }

  return {
    groups: data.aAllSubscriptionPlans.map(mapGroup),
    footerNote: data.sFooterNote ?? '',
    headerMediaUrl: data.sHeaderMediaURL ?? '',
  };
}
