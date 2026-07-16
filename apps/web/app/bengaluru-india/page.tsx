import type { Metadata } from "next";
import { TransitAtlas } from "../components/transit-atlas";

export const metadata: Metadata = {
  title: "Bengaluru, India",
  description: "Explore Bengaluru Namma Metro's Purple, Green, and Yellow lines and stations.",
  alternates: { canonical: "/bengaluru-india" },
};

export default function BengaluruPage() {
  return <TransitAtlas initialRegionId="in-blr" />;
}
