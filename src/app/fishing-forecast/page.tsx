import { redirect } from "next/navigation";

/** Forecast UX lives on the map (click for pin + popup). */
export default function FishingForecastPage() {
  redirect("/map");
}
