import AddProfileClient from "./AddProfileClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add Profile - JOJO",
  description: "Add a new profile to your JOJO account.",
};

export default async function AddProfilePage() {
    return <AddProfileClient />;
}
