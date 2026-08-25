import { useAuthStore } from '@/store/useAuthStore';
import { useProfileStore } from '@/store/useProfileStore';
import type { VerifySubscriptionData } from '@/lib/api/verify-subscription';

/**
 * Build payload for user_specific_properties event
 */
export function buildUserSpecificPropertiesPayload(rawSubData?: VerifySubscriptionData | null): Record<string, any> {
  const authState = useAuthStore.getState();
  const profileState = useProfileStore.getState();

  const subData: VerifySubscriptionData | null = rawSubData
    ? (rawSubData as any).subscription
      ? (rawSubData as VerifySubscriptionData)
      : (rawSubData as any).data?.subscription
        ? ((rawSubData as any).data as VerifySubscriptionData)
        : rawSubData
    : null;

  const subscription = subData?.subscription || null;
  const endDate = subscription?.dEndDate;
  const isExpired = endDate ? new Date(endDate).getTime() < Date.now() : false;
  const isGold = !!(subscription && !isExpired);

  return {
    user_id: authState.user?.id ? String(authState.user.id) : "",
    profile_id: profileState.selectedProfile?.profile_id || "",
    profile_name: profileState.selectedProfile?.profile_name || "",
    is_kid: profileState.selectedProfile?.is_kid ?? false,
    phone: authState.user?.phone || "",
    email: authState.user?.email || "",
    is_guest: authState.user?.isGuest ?? false,
    is_special_user: authState.user?.isSpecialUser ?? false,
    operator_name: authState.user?.operatorName || "",
    is_gold: isGold,
    is_subscribed: isGold,
    plan_type: subData?.planType || (rawSubData as any)?.planType || (rawSubData as any)?.data?.planType || "",
    subscription_id: subscription?.sToken || "",
    subscription_group_id: subscription?.sGroupId || "",
    subscription_group_name: subscription?.oGroupTranslation?.sName || subscription?.sGroupId || "",
    subscription_product_id: subscription?.sProductId || "",
    subscription_product_name: subscription?.oProductTranslation?.sName || subscription?.sSubProductLabel || "",
    subscription_start_date: subscription?.dStartDate || "",
    subscription_end_date: subscription?.dEndDate || "",
    subscription_payment_provider: subscription?.sPaymentProviderId || "",
    subscription_validity_days: subscription?.nValidityDays ?? null,
    subscription_validity_duration: subscription?.sValidityDuration || "",
  };
}