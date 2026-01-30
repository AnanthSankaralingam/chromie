import { createClient } from "@/lib/supabase/server"
import AppBar from "@/components/ui/app-bars/app-bar"
import { parseMarkdown } from "@/components/ui/chat/markdown-parser"
import { Shield } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default async function PublicPrivacyPolicyPage({ params }) {
  const { slug } = params
  const supabase = createClient()

  // Fetch privacy policy data
  const { data: project, error } = await supabase
    .from("projects")
    .select("name, privacy_policy, privacy_policy_last_updated")
    .eq("privacy_slug", slug)
    .not("privacy_policy", "is", null)
    .single()

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0A0F] via-[#0F111A] to-[#0A0A0F] text-white">
        <AppBar />
        <div className="max-w-4xl mx-auto px-6 py-12 text-center">
          <Shield className="h-16 w-16 text-slate-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-400 mb-2">Privacy Policy Not Found</h1>
          <p className="text-slate-500">This privacy policy does not exist or has been removed.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A0F] via-[#0F111A] to-[#0A0A0F] text-white">
      <AppBar />
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="backdrop-blur-xl bg-slate-800/30 rounded-2xl border border-slate-700/40 p-8">
          <div className="flex items-center space-x-3 mb-6">
            <Shield className="h-8 w-8 text-purple-400" />
            <div>
              <h1 className="text-3xl font-bold">{project.name}</h1>
              <p className="text-sm text-slate-400">Privacy Policy</p>
            </div>
          </div>

          {project.privacy_policy_last_updated && (
            <p className="text-xs text-slate-500 mb-8">
              Last Updated: {new Date(project.privacy_policy_last_updated).toLocaleDateString()}
            </p>
          )}

          <div
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(project.privacy_policy) }}
          />

          <div className="mt-12 pt-6 border-t border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-slate-500 text-sm">
              <span>Hosted on</span>
              <Link href="/" className="flex items-center space-x-1 hover:text-purple-400 transition-colors">
                <Image src="/chromie-logo-1.png" alt="Chromie" width={20} height={20} />
                <span className="font-semibold">Chromie</span>
              </Link>
            </div>
            <Link
              href="/pricing"
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              Create your own privacy policy →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
