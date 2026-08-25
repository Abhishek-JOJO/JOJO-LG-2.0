import PaymentClient from "./PaymentClient";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Secure Checkout - JOJO",
  description: "Complete your secure payment for JOJO Gold.",
};

export default async function PaymentPage() {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-theme_12 text-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-theme_13 border-t-transparent" />
        </div>
      }>
        <PaymentClient />
      </Suspense>
    );
}
