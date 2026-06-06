import { preload } from "react-dom";
import { HomeFeedClient } from "@/components/home-feed-client";
import { HomeLandingClient } from "@/components/home-landing-client";
import { loadPublicStats } from "@/lib/public-stats-server";

/**
 * Logged-out `/` is server-rendered for LCP; signed-in feed hydrates via {@link HomeFeedClient}.
 */
export default async function HomePage() {
  preload("/fishlist-logo.png", { as: "image" });

  const initialStats = await loadPublicStats();

  return (
    <>
      <div id="fishlist-landing-ssr">
        <HomeLandingClient initialStats={initialStats} />
      </div>
      <HomeFeedClient />
    </>
  );
}

/** Revalidate home stats with the public stats API (5 minutes). */
export const revalidate = 300;
