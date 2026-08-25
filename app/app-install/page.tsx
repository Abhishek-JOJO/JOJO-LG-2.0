import AppInstallClient from "../appInstall/AppInstallClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Install JOJO App",
  description: "Download and install the JOJO app for the best experience.",
};

export default async function AppInstallDashPage() {
  return <AppInstallClient />;
}
