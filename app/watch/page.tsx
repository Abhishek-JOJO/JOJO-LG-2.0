import WatchClient from "./WatchClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Watch - JOJO",
  description: "Watch premium Gujarati movies, nataks, and web series on JOJO.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function WatchPage() {
    return <WatchClient />;
}
