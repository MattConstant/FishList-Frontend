import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fishing forecast",
  description:
    "Barometric pressure and solunar bite windows for a chosen day and location.",
};

export default function FishingForecastLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
