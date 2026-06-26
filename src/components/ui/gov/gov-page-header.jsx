import { SECTION_LABEL } from "@/components/ui/app-dashboard-theme"

export default function GovPageHeader({ label, title, description, actions }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {label ? <p className={SECTION_LABEL}>{label}</p> : null}
        <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}
