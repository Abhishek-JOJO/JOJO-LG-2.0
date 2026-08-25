import WatchingClient from "./WatchingClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Who's Watching? - JOJO",
  description: "Select your profile to start watching JOJO.",
};

export default async function WatchingPage() {
    return <WatchingClient />;
}
