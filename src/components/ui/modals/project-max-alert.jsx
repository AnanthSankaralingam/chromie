import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertTriangle, Plus, Trash2, CreditCard } from "lucide-react"
import Link from "next/link"

export function ProjectMaxAlert({
  isOpen,
  onClose,
  currentPlan = 'free',
  currentProjectCount = 0,
  maxProjects = 10,
  onUpgradePlan,
  onDeleteProject
}) {
  const planNames = {
    free: 'Free',
    starter: 'Starter',
    pro: 'Pro'
  }

  const planLimits = {
    free: 10,
    starter: 25,
    pro: 50
  }

  const nextPlan = currentPlan === 'free' ? 'starter' : currentPlan === 'starter' ? 'pro' : null
  const nextPlanName = nextPlan ? planNames[nextPlan] : null
  const nextPlanLimit = nextPlan ? planLimits[nextPlan] : null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/95 border-slate-700 backdrop-blur-sm">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-white">Project Limit Reached</DialogTitle>
              <DialogDescription className="text-sm text-slate-300">
                You've reached your {planNames[currentPlan]} plan limit
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">Current Usage</span>
              <span className="text-sm text-slate-400">{currentProjectCount} / {maxProjects} projects</span>
            </div>
            <div className="w-full bg-slate-600 rounded-full h-2 overflow-hidden">
              <div
                className="bg-red-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((currentProjectCount / maxProjects) * 100, 100)}%` }}
              />
            </div>
          </div>

          <p className="text-sm text-slate-300">
            You've reached the maximum number of projects allowed on your {planNames[currentPlan]} plan.
            To create more projects, you can either:
          </p>

          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
              <Trash2 className="h-5 w-5 text-slate-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Delete existing projects</p>
                <p className="text-xs text-slate-400">Remove unused projects to free up space</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 hover:text-white"
                onClick={onDeleteProject}
              >
                Manage
              </Button>
            </div>

            {nextPlan && (
              <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-400/20">
                <CreditCard className="h-5 w-5 text-purple-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Upgrade to {nextPlanName}</p>
                  <p className="text-xs text-slate-400">Get up to {nextPlanLimit} projects</p>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
                  onClick={onUpgradePlan}
                >
                  Upgrade
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 hover:text-white"
          >
            Close
          </Button>
          {nextPlan && (
            <Button
              onClick={onUpgradePlan}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Upgrade Plan
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
