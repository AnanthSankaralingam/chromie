/** Shared Open Graph image for social previews (LinkedIn, Slack, etc.) */
export const SITE_OG_IMAGE = {
  url: "/chromie-og.png",
  width: 1024,
  height: 558,
  alt: "chromie.dev",
};

export function openGraphWithImage(fields) {
  return {
    ...fields,
    images: [SITE_OG_IMAGE],
  };
}
