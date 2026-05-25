import { preload } from "react-dom";
import { HomeFeedClient } from "@/components/home-feed-client";
import { HomeLandingStatic } from "@/components/home-landing-static";

/**
 * Logged-out `/` is server-rendered for LCP; signed-in feed hydrates via {@link HomeFeedClient}.
 */
export default function HomePage() {
  preload("/fishlist-logo.png", { as: "image" });
  return (
    <>
      <div id="fishlist-landing-ssr">
        <HomeLandingStatic />
      </div>
      <HomeFeedClient />
    </>
  );
}
