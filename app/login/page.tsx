import LoginPage from "./sub-login-page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - JOJO",
  description: "Login to your JOJO account to watch premium Gujarati entertainment.",
};

export default async function page() {
    return <LoginPage />
}