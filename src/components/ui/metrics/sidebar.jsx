"use client"

import { useEffect, useState } from "react"
import { LayoutDashboard, BarChart3, Settings2, ChevronLeft, ChevronRight, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/forms-and-input/select"
import { useIsMobile } from "@/hooks"

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings2 }
]

export default function MetricsSidebar({
  collapsed,
  onToggle,
  activeTab,
  onTabChange,
  projects,
  selectedProjectId,
  onProjectChange
}) {
  const isMobile = useIsMobile()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile drawer when tab changes
  useEffect(() => {
    if (isMobile) {
      setMobileOpen(false)
    }
  }, [activeTab, isMobile])

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobile && mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileOpen, isMobile])

  const handleNavClick = (tabId) => {
    onTabChange(tabId)
  }

  // Mobile: Render hamburger menu button
  if (isMobile) {
    return (
      <>
        {/* Mobile menu button */}
        <div className="fixed top-20 left-4 z-40">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMobileOpen(true)}
            className="bg-slate-800/90 border-slate-700/40 text-white hover:bg-slate-700"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Mobile backdrop overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 animate-in fade-in"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Mobile drawer */}
        <div
          className={`fixed top-0 left-0 h-full w-64 bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/40 z-50 transition-transform duration-200 ease-in-out ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          role="navigation"
          aria-label="Metrics navigation"
        >
          {/* Close button */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700/40">
            <h2 className="text-lg font-semibold text-white">Metrics</h2>
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => setMobileOpen(false)}
              className="text-slate-400 hover:text-white"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Project selector */}
          <div className="p-4">
            <label className="text-xs font-semibold text-slate-400 mb-2 block">
              Project
            </label>
            <Select value={selectedProjectId || ''} onValueChange={onProjectChange}>
              <SelectTrigger className="w-full bg-slate-800/50 border-slate-700/40 text-white">
                <SelectValue placeholder="Select a project..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {projects.length === 0 ? (
                  <div className="px-2 py-6 text-center text-sm text-slate-400">
                    No projects found
                  </div>
                ) : (
                  projects.map((project) => (
                    <SelectItem
                      key={project.id}
                      value={project.id}
                      className="text-white hover:bg-slate-700 cursor-pointer"
                    >
                      {project.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Navigation items */}
          <nav className="px-2 py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-purple-500/20 border-l-2 border-purple-400 text-purple-300'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </>
    )
  }

  // Desktop: Render collapsible sidebar
  return (
    <aside
      className={`sticky top-0 h-screen bg-slate-900/50 backdrop-blur-xl border-r border-slate-700/40 transition-all duration-200 ease-in-out ${
        collapsed ? 'w-16' : 'w-60'
      }`}
      role="navigation"
      aria-label="Metrics navigation"
    >
      {/* Toggle button */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-end'} p-4 border-b border-slate-700/40`}>
        <Button
          variant="ghost"
          size="iconSm"
          onClick={onToggle}
          className="text-slate-400 hover:text-white hover:bg-slate-800/50"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Project selector (only when expanded) */}
      {!collapsed && (
        <div className="p-4">
          <label className="text-xs font-semibold text-slate-400 mb-2 block">
            Project
          </label>
          <Select value={selectedProjectId || ''} onValueChange={onProjectChange}>
            <SelectTrigger className="w-full bg-slate-800/50 border-slate-700/40 text-white">
              <SelectValue placeholder="Select a project..." />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {projects.length === 0 ? (
                <div className="px-2 py-6 text-center text-sm text-slate-400">
                  No projects found
                </div>
              ) : (
                projects.map((project) => (
                  <SelectItem
                    key={project.id}
                    value={project.id}
                    className="text-white hover:bg-slate-700 cursor-pointer"
                  >
                    {project.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Navigation items */}
      <nav className="px-2 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                collapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-purple-500/20 border-l-2 border-purple-400 text-purple-300'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
              aria-current={isActive ? 'page' : undefined}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
