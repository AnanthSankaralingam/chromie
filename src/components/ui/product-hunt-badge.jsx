import { cn } from "@/lib/utils"

const PRODUCT_HUNT_URL =
  "https://www.producthunt.com/products/chromie-dev?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-chromie-dev"

const BADGE_IMAGE_URL =
  "https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1147960&theme=dark&t=1778880564602"

export function ProductHuntBadge({ className }) {
  return (
    <a
      href={PRODUCT_HUNT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-block opacity-90 transition-opacity hover:opacity-100",
        className
      )}
    >
      <img
        alt="chromie.dev - the deterministic stack for web agents | Product Hunt"
        width={250}
        height={54}
        src={BADGE_IMAGE_URL}
        className="h-auto w-[200px] sm:w-[250px]"
      />
    </a>
  )
}
