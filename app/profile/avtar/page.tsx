import AvtarClient from "./AvtarClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Choose Avatar - JOJO",
  description: "Choose an avatar for your JOJO profile.",
};

export default async function AvtarPage() {
    return <AvtarClient />;
}
