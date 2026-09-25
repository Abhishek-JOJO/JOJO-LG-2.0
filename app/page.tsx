import ParentPage from "./parent-page";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { prefetchRouteRails } from "@/lib/ssr/prefetchRails";
import { SplashScreenVideo } from "@/components/common/SplashScreenVideo";

export default async function Home() {
  const queryClient = await prefetchRouteRails("/", 1);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ParentPage />
      <SplashScreenVideo />
    </HydrationBoundary>
  );
}
