import RegisterPageClient from "./sub-register-page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register - JOJO",
  description: "Create your JOJO account to watch premium Gujarati entertainment.",
};

export default async function RegisterPage() {
    return <RegisterPageClient />;
}
