import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SpotOn — PL Predictions",
    short_name: "SpotOn",
    description: "Predict Premier League scores and climb the leaderboard.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1a0b2e",
    theme_color: "#1a0b2e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
