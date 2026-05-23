"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "@/components/SessionProviderClient"
import AppBar from "@/components/ui/app-bars/app-bar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/forms-and-input/input"
import AuthModal from "@/components/ui/modals/modal-auth"
import { Play, Plus, RefreshCw } from "lucide-react"

const CARD_CLASS = "border-zinc-800 bg-zinc-900 text-zinc-100 shadow-none"
const INPUT_CLASS =
  "mt-1 bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:ring-violet-500/50"
const BTN_OUTLINE_CLASS =
  "border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600 hover:text-zinc-100"

const DEFAULT_FILTERS = {
  city: "Suwanee, GA",
  min_price: 400000,
  max_price: 650000,
  min_beds: 3,
  property_type: "houses",
  listing_type: "for_sale",
}

function FilterField({ label, children }) {
  return (
    <div className="min-w-0">
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      {children}
    </div>
  )
}

export default function AutomationsPage() {
  const { user } = useSession()
  const [automations, setAutomations] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [creating, setCreating] = useState(false)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [showAuth, setShowAuth] = useState(false)

  const loadAutomations = useCallback(async () => {
    const res = await fetch("/api/automations")
    if (res.status === 401) {
      setShowAuth(true)
      return
    }
    const json = await res.json()
    setAutomations(json.automations || [])
    if (json.automations?.length && !selectedId) {
      setSelectedId(json.automations[0].id)
    }
  }, [selectedId])

  const loadRuns = useCallback(async (id) => {
    if (!id) return
    const res = await fetch(`/api/automations/${id}/runs`)
    if (!res.ok) return
    const json = await res.json()
    setRuns(json.runs || [])
  }, [])

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    loadAutomations().finally(() => setLoading(false))
  }, [user, loadAutomations])

  useEffect(() => {
    if (selectedId) loadRuns(selectedId)
  }, [selectedId, loadRuns])

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  async function createZillowAutomation() {
    setCreating(true)
    try {
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Zillow — ${filters.city}`,
          scenario_id: "zillow_listing_alert",
          params: {
            id: "zillow_listing_alert",
            filters: {
              city: filters.city.trim(),
              min_price: Number(filters.min_price),
              max_price: Number(filters.max_price),
              min_beds: Number(filters.min_beds),
              property_type: filters.property_type,
              listing_type: filters.listing_type,
            },
            recipient_email: user?.email || "",
            min_addresses: 3,
          },
        }),
      })
      const json = await res.json()
      if (json.automation) {
        await loadAutomations()
        setSelectedId(json.automation.id)
      }
    } finally {
      setCreating(false)
    }
  }

  async function runNow() {
    if (!selectedId) return
    setRunning(true)
    try {
      await fetch(`/api/automations/${selectedId}/run`, { method: "POST" })
      setTimeout(() => loadRuns(selectedId), 3000)
    } finally {
      setRunning(false)
    }
  }

  const selected = automations.find((a) => a.id === selectedId)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <AppBar />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Workflow automations</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Configure Zillow listing alerts and run them on Browserbase via Lambda (MVP).
        </p>

        {!user && (
          <Card className={`mt-8 ${CARD_CLASS}`}>
            <CardContent className="pt-6">
              <p className="text-sm text-zinc-400">Sign in to manage automations.</p>
              <Button
                className="mt-4 bg-violet-600 text-white hover:bg-violet-500"
                onClick={() => setShowAuth(true)}
              >
                Sign in
              </Button>
            </CardContent>
          </Card>
        )}

        {user && (
          <>
            <Card className={`mt-8 ${CARD_CLASS}`}>
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-medium text-zinc-100">
                  New Zillow automation
                </CardTitle>
                <CardDescription className="text-zinc-500">
                  Set search filters, then create an automation to run on demand.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FilterField label="City">
                    <Input
                      value={filters.city}
                      onChange={(e) => updateFilter("city", e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </FilterField>
                  <FilterField label="Min price">
                    <Input
                      type="number"
                      min={0}
                      step={1000}
                      value={filters.min_price}
                      onChange={(e) => updateFilter("min_price", e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </FilterField>
                  <FilterField label="Max price">
                    <Input
                      type="number"
                      min={0}
                      step={1000}
                      value={filters.max_price}
                      onChange={(e) => updateFilter("max_price", e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </FilterField>
                  <FilterField label="Min beds">
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={filters.min_beds}
                      onChange={(e) => updateFilter("min_beds", e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </FilterField>
                  <FilterField label="Property type">
                    <Input
                      value={filters.property_type}
                      onChange={(e) => updateFilter("property_type", e.target.value)}
                      placeholder="houses"
                      className={INPUT_CLASS}
                    />
                  </FilterField>
                  <FilterField label="Listing type">
                    <Input
                      value={filters.listing_type}
                      onChange={(e) => updateFilter("listing_type", e.target.value)}
                      placeholder="for_sale"
                      className={INPUT_CLASS}
                    />
                  </FilterField>
                </div>
                <Button
                  type="button"
                  disabled={creating || !filters.city.trim()}
                  onClick={createZillowAutomation}
                  className="mt-5 bg-violet-600 text-white hover:bg-violet-500 focus-visible:ring-violet-500"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {creating ? "Creating…" : "Create automation"}
                </Button>
              </CardContent>
            </Card>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <Card className={CARD_CLASS}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-medium text-zinc-100">
                    Your automations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {loading && <p className="text-sm text-zinc-500">Loading…</p>}
                  {!loading && automations.length === 0 && (
                    <p className="text-sm text-zinc-500">No automations yet.</p>
                  )}
                  {automations.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelectedId(a.id)}
                      className={`w-full text-left rounded-lg px-3 py-2 text-sm border transition-colors ${
                        selectedId === a.id
                          ? "border-violet-500/80 bg-violet-500/15 text-zinc-100"
                          : "border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/50"
                      }`}
                    >
                      <div className="font-medium">{a.name}</div>
                      <div className="text-xs text-zinc-500">{a.scenario_id}</div>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card className={CARD_CLASS}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="text-base font-medium text-zinc-100">Runs</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className={BTN_OUTLINE_CLASS}
                      disabled={!selectedId}
                      onClick={() => loadRuns(selectedId)}
                      aria-label="Refresh runs"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      disabled={!selectedId || running}
                      onClick={runNow}
                      className="bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      {running ? "Running…" : "Run now"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                  {selected && (
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-1.5">Saved filters</p>
                      <pre className="text-xs text-zinc-400 overflow-x-auto rounded-md bg-zinc-950 p-3 border border-zinc-800 font-mono leading-relaxed">
                        {JSON.stringify(selected.params?.filters, null, 2)}
                      </pre>
                    </div>
                  )}
                  {!selected && (
                    <p className="text-sm text-zinc-500">Select an automation to view runs.</p>
                  )}
                  {selected && runs.length === 0 && (
                    <p className="text-sm text-zinc-500">No runs yet.</p>
                  )}
                  {runs.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm"
                    >
                      <div className="flex justify-between gap-2">
                        <span
                          className={
                            r.status === "success"
                              ? "text-emerald-400"
                              : r.status === "failed"
                                ? "text-red-400"
                                : "text-amber-400"
                          }
                        >
                          {r.status}
                        </span>
                        <span className="text-xs text-zinc-500 shrink-0">
                          {r.started_at ? new Date(r.started_at).toLocaleString() : ""}
                        </span>
                      </div>
                      {r.browserbase_debug_url && (
                        <a
                          href={r.browserbase_debug_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-violet-400 hover:underline mt-1 inline-block"
                        >
                          Browserbase session
                        </a>
                      )}
                      {r.error_message && (
                        <p className="text-xs text-red-300 mt-1">{r.error_message}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
      <AuthModal open={showAuth} onOpenChange={setShowAuth} />
    </div>
  )
}
