import GovProfileSharePage from "@/components/pages/gov-profile-share-page"

export const metadata = {
  title: "Shared Government Contract Opportunities",
  description: "View shared government contract opportunities matched by Chromie.",
}

export default async function Page({ params }) {
  const { id } = await params
  return <GovProfileSharePage govProfileId={id} />
}
