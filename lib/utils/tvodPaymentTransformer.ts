/**
 * TVOD PAYMENT DATA TRANSFORMER
 * 
 * Safely transforms TVOD asset pricing data to the format expected by usePaymentHandler.
 * Handles multiple API response structures and provides fallback values. Supports both snake_case (old)
 * and camelCase (new) formats.
 */

export interface TVODPaymentPlan {
  sProductId: string;
  oProductTranslation: {
    sName: string;
    sTitle: string;
    sDescription: string;
    aInfoItems?: any[];
  };
  pricing: {
    nPrice: number;
    sCurrency: string;
    sCurrencySymbol: string;
  };
  aProviderSkus: any[];
  nRentalValidityDays: number;
  nInitialValidityDays: number;
  aFeatures: any[];
  assetMetadata: {
    assetId: string;
    title: string;
    assetType?: string;
    nameAnalytics?: string;
    landscapeImage?: string;
    releaseDate?: string;
    certification?: string;
    genres?: any[];
    durationSeconds?: number;
  };
  paymentType: "TVOD";
  assetId: string; // Direct flat field for convenience
}

export const transformTVODToPaymentPlan = (assetPricing: any, asset: any): TVODPaymentPlan | null => {
  try {
    if (!assetPricing || !asset) {
      console.warn("⚠️ TVOD Transformer: Missing required data", { assetPricing, asset });
      return null;
    }

    const assetId = asset.assetId || asset.asset_id;
    const assetTitle = asset.title || asset.asset_title || "Premium Content";
    const assetDescription = asset.description || asset.asset_description || "Access to premium content";

    let product: any = null;
    let pricing: any = null;
    let providerSkus: any[] = [];

    // Method 1: New API structure with aOneTimeProducts
    if (assetPricing.aOneTimeProducts && assetPricing.aOneTimeProducts.length > 0) {
      product = assetPricing.aOneTimeProducts[0];
      providerSkus = product.aProviderSkus || [];
      pricing = providerSkus?.[0]?.oPricing;
    }
    // Method 1.5: Enriched mapped structure with rawProducts
    else if (assetPricing.rawProducts && assetPricing.rawProducts.length > 0) {
      product = assetPricing.rawProducts[0];
      providerSkus = product.aProviderSkus || [];
      pricing = providerSkus?.[0]?.oPricing;
    }
    // Method 2: Direct product structure
    else if (assetPricing.product) {
      product = assetPricing.product;
      providerSkus = product.aProviderSkus || [];
      pricing = providerSkus?.[0]?.oPricing;
    }
    // Method 3: Legacy structure with direct pricing
    else if (assetPricing.pricing) {
      pricing = assetPricing.pricing;
      providerSkus = assetPricing.aProviderSkus || [];
      
      product = {
        sProductId: `tvod_${assetId}`,
        oProductTranslation: {
          sName: assetTitle,
          sTitle: assetTitle,
          sDescription: assetDescription,
        },
        aProviderSkus: providerSkus,
        nRentalValidityDays: assetPricing.nValidity || 30,
        nInitialValidityDays: assetPricing.nValidity || 30,
        aFeatures: assetPricing.aDescription || [],
      };
    }
    // Method 4: Flat mapped query fallback
    else if (assetPricing.price !== undefined) {
      pricing = {
        nPrice: assetPricing.price,
        sCurrency: assetPricing.currency || "INR",
        sCurrencySymbol: assetPricing.currencySymbol || "₹"
      };
      providerSkus = [{
        sUniqueSkuId: assetPricing.skuId,
        sPaymentProviderId: "RZP",
        sProviderSkuId: assetPricing.skuId,
        sProviderSkuLabel: `Razorpay ${assetPricing.price}`,
        oPricing: pricing
      }];
      product = {
        sProductId: assetPricing.productId,
        oProductTranslation: {
          sName: assetPricing.sName || "First Day First Show",
          sTitle: assetTitle,
          sDescription: assetDescription,
          aInfoItems: assetPricing.oProductTranslation?.aInfoItems || [
            {
              sTitle: "Validity",
              sValue: `${assetPricing.initialValidityDays || 30} Days`,
              sDescription: `You have ${assetPricing.initialValidityDays || 30} days to start watching this content`,
              nOrder: 1
            },
            {
              sTitle: "Watch Time",
              sValue: `${assetPricing.rentalValidityDays || 7} days`,
              sDescription: `Once started, you have ${assetPricing.rentalValidityDays || 7} days to finish watching`,
              nOrder: 2
            }
          ]
        },
        aProviderSkus: providerSkus,
        nRentalValidityDays: assetPricing.rentalValidityDays || 7,
        nInitialValidityDays: assetPricing.initialValidityDays || 30,
        aFeatures: assetPricing.aFeatures || []
      };
    } else {
      console.warn("⚠️ TVOD Transformer: No valid pricing structure found");
      return null;
    }

    // Fallback pricing check
    if (!pricing && assetPricing.oPricing) {
      pricing = assetPricing.oPricing;
    }

    if (!pricing || (pricing.nPrice === undefined && pricing.price === undefined)) {
      console.warn("⚠️ TVOD Transformer: Missing pricing data");
      return null;
    }

    const finalPrice = pricing.nPrice !== undefined ? pricing.nPrice : pricing.price;

    if (!providerSkus || providerSkus.length === 0 || !(providerSkus[0].sUniqueSkuId || providerSkus[0].uniqueSkuId)) {
      console.warn("⚠️ TVOD Transformer: Missing provider SKU data");
      return null;
    }

    const sku = providerSkus[0];
    const skuId = sku.sUniqueSkuId || sku.uniqueSkuId;

    // Normalizing SKU structures for usePaymentHandler
    const normalizedSkus = providerSkus.map(s => ({
      sUniqueSkuId: s.sUniqueSkuId || s.uniqueSkuId,
      sPaymentProviderId: s.sPaymentProviderId || s.paymentProviderId,
      sProviderSkuId: s.sProviderSkuId || s.providerSkuId,
      sProviderSkuLabel: s.sProviderSkuLabel || s.providerSkuLabel,
      oPricing: s.oPricing ? {
        nPrice: s.oPricing.nPrice ?? s.oPricing.price,
        sCurrency: s.oPricing.sCurrency ?? s.oPricing.currency,
        sCurrencySymbol: s.oPricing.sCurrencySymbol ?? s.oPricing.currencySymbol,
      } : {
        nPrice: finalPrice,
        sCurrency: pricing.sCurrency || pricing.currency || "INR",
        sCurrencySymbol: pricing.sCurrencySymbol || pricing.currencySymbol || "₹",
      },
      oOfferDetails: s.oOfferDetails || s.offer || null,
    }));

    const transformedPlan: TVODPaymentPlan = {
      sProductId: product.sProductId || product.productId || `tvod_${assetId}`,
      oProductTranslation: {
        sName: product.oProductTranslation?.sName || product.name || assetTitle,
        sTitle: product.oProductTranslation?.sTitle || product.title || assetTitle,
        sDescription: product.oProductTranslation?.sDescription || product.description || assetDescription,
        aInfoItems: product.oProductTranslation?.aInfoItems || [],
      },
      pricing: {
        nPrice: finalPrice,
        sCurrency: pricing.sCurrency || pricing.currency || "INR",
        sCurrencySymbol: pricing.sCurrencySymbol || pricing.currencySymbol || "₹",
      },
      aProviderSkus: normalizedSkus,
      nRentalValidityDays: product.nRentalValidityDays || product.nInitialValidityDays || assetPricing.nValidity || 30,
      nInitialValidityDays: product.nInitialValidityDays || product.nRentalValidityDays || assetPricing.nValidity || 30,
      aFeatures: product.aFeatures || product.features || assetPricing.aDescription || [],
      assetMetadata: {
        assetId: assetId,
        title: assetTitle,
        assetType: asset.assetType || asset.asset_type,
        nameAnalytics: asset.nameAnalytics || asset.name_analytics,
        landscapeImage: asset.landscape?.url || asset.poster?.[0]?.url || asset.image || asset.thumbnail || "",
        releaseDate: asset.releaseDate || asset.asset_release_date || "",
        certification: asset.certification || asset.asset_certification || "",
        genres: asset.genres || asset.asset_genre || [],
        durationSeconds: asset.durationSeconds || asset.asset_total_duration || 0,
      },
      paymentType: "TVOD",
      assetId: assetId,
    };

    return transformedPlan;
  } catch (error) {
    console.error("❌ TVOD Transformer: Error transforming data", error);
    return null;
  }
};

export const validateTVODPaymentData = (assetPricing: any, asset: any) => {
  if (!assetPricing) {
    return { 
      isValid: false, 
      error: "Missing pricing data. Please try again." 
    };
  }

  if (!asset || !(asset.assetId || asset.asset_id)) {
    return { 
      isValid: false, 
      error: "Missing asset information. Please refresh the page." 
    };
  }

  // Check if user has already purchased
  const isPurchased = assetPricing.bIsUserPurchased === true || assetPricing.isUserPurchased === true;
  if (isPurchased) {
    return { 
      isValid: false, 
      error: "You have already purchased this content." 
    };
  }

  const transformedPlan = transformTVODToPaymentPlan(assetPricing, asset);
  if (!transformedPlan) {
    return { 
      isValid: false, 
      error: "Invalid pricing data. Please contact support." 
    };
  }

  return { 
    isValid: true, 
    transformedPlan 
  };
};

export default {
  transformTVODToPaymentPlan,
  validateTVODPaymentData,
};
