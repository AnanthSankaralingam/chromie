"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/forms-and-input/input"
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/app-dashboard-theme"

function Field({ label, description, required, children }) {
  return (
    <div className="min-w-0">
      <label className={LABEL_CLASS}>
        {label}
        {required ? <span className="text-red-400 ml-0.5">*</span> : null}
      </label>
      {description ? <p className="text-xs text-zinc-600 mt-0.5">{description}</p> : null}
      {children}
    </div>
  )
}

/**
 * Renders workflow_editable_params rows (e.g. recipient_email) bound to automations.params.
 */
export default function AutomationParamFields({ scenarioId, params, onParamsChange }) {
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!scenarioId) {
      setFields([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetch(`/api/workflow-editable-params?scenario_id=${encodeURIComponent(scenarioId)}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setFields(json.params || [])
      })
      .catch(() => {
        if (!cancelled) setFields([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [scenarioId])

  if (loading) {
    return <p className="text-xs text-zinc-500">Loading parameters…</p>
  }
  if (fields.length === 0) {
    return null
  }

  function setParam(key, value) {
    onParamsChange({ ...params, [key]: value })
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <Field
          key={field.param_key}
          label={field.label}
          description={field.description}
          required={field.required}
        >
          <Input
            type={field.param_type === "email" ? "email" : "text"}
            required={field.required}
            value={params[field.param_key] ?? ""}
            onChange={(e) => setParam(field.param_key, e.target.value)}
            className={INPUT_CLASS}
            placeholder={field.param_type === "email" ? "you@example.com" : ""}
          />
        </Field>
      ))}
    </div>
  )
}
