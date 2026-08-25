import TermsClient from "./TermsClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions - JOJO",
  description: "Read the JOJO terms and conditions.",
  alternates: {
    canonical: "https://jojoapp.in/terms-conditions",
  },
};

export default async function TermsPage() {
    return <TermsClient />;
}
