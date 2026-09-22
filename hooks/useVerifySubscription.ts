import { useQuery } from "@tanstack/react-query";
import { verifySubscription } from "@/lib/api/verify-subscription";
import { appConfig } from "@/lib/config/app.config";
import { useAuthStore } from "@store/useAuthStore";
import { useSubscriptionStore } from "@/store/useSubscriptionStore";
import { useEffect } from "react";

export function useVerifySubscription(countryCode: string, sessionId?: string | null, isAppReady?: boolean) {
    const user = useAuthStore((state) => state.user);
    const isGuest = user?.isGuest ?? false;

    const query = useQuery({
        queryKey: ["verify-subscription", sessionId, countryCode, user?.id],
        queryFn: async ({ signal }) => verifySubscription(countryCode, sessionId ?? undefined, signal),
        enabled: !!sessionId && !!user && !isGuest && !!countryCode && (isAppReady === undefined || !!isAppReady),
        staleTime: appConfig.STALE_TIME,
        retry: false,
    });

    useEffect(() => {
        if (query.data) {
            useSubscriptionStore.getState().setSubscriptionData(query.data);
        }
    }, [query.data]);

    return query;
}
