import PrivacyClient from "./PrivacyClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - JOJO",
  description: "Read the JOJO privacy policy.",
  alternates: {
    canonical: "https://jojoapp.in/privacy-policy",
  },
};

export default async function PrivacyPage() {
    return <PrivacyClient />;
}
