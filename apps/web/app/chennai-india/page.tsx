import type { Metadata } from "next";
import { TransitAtlas } from "../components/transit-atlas";

export const metadata: Metadata = {
  title: "Chennai, India",
  description: "Explore Chennai Metro lines, stations, timetables, and mapped MTC bus routes.",
  alternates: { canonical: "/chennai-india" },
};

export default function ChennaiPage() {
  return <TransitAtlas initialRegionId="in-maa" />;
}
