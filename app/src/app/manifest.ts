import { COLORS } from "@/constants/colors";
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Credit Markets",
    short_name: "Credit Markets",
    description:
      "Institutional access to asset-backed private credit in emerging markets. Structuring and standardizing local credit into globally investable assets.",
    start_url: "/",
    display: "standalone",
    background_color: COLORS.white,
    theme_color: COLORS.brand.darkBlue,
    icons: [
      {
        src: "/favicon/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/favicon/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
