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
      <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-xl">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-slate-900">Project Limit Reached</DialogTitle>
              <DialogDescription className="text-sm text-slate-600">
                You've reached your {planNames[currentPlan]} plan limit
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="py-4">
          <div className="bg-slate-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Current Usage</span>
              <span className="text-sm text-slate-500">{currentProjectCount} / {maxProjects} projects</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-red-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${Math.min((currentProjectCount / maxProjects) * 100, 100)}%` }}
              />
            </div>
          </div>
          
          <p className="text-sm text-slate-600 mb-4">
            You've reached the maximum number of projects allowed on your {planNames[currentPlan]} plan. 
            To create more projects, you can either:
          </p>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
              <Trash2 className="h-4 w-4 text-slate-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700">Delete existing projects</p>
                <p className="text-xs text-slate-500">Remove unused projects to free up space</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={onDeleteProject}
              >
                Manage
              </Button>
            </div>
            
            {nextPlan && (
              <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                <CreditCard className="h-4 w-4 text-purple-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">Upgrade to {nextPlanName}</p>
                  <p className="text-xs text-slate-500">Get up to {nextPlanLimit} projects</p>
                </div>
                <Button 
                  variant="default" 
                  size="sm"
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                  onClick={onUpgradePlan}
                >
                  Upgrade
                </Button>
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {nextPlan && (
            <Button 
              onClick={onUpgradePlan}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
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
