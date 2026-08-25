import SubscriptionClient from "./SubscriptionClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "JOJO Gold Subscription - JOJO",
  description: "Subscribe to JOJO Gold and get unlimited access to premium Gujarati movies, nataks, and shows.",
};

export default async function SubscriptionPage() {
    return <SubscriptionClient />;
}
