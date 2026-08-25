import DownloadAppClient from "./DownloadAppClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Download JOJO App",
  description: "Download the JOJO app for the best experience.",
};

export default async function DownloadAppPage() {
    return <DownloadAppClient />;
}
