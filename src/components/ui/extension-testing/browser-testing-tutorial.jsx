"use client"

import { MousePointer, Keyboard, Eye } from "lucide-react"

export default function BrowserTestingTutorial() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="w-full max-w-4xl mx-auto">
        <div className="relative">
          {/* Loading spinner in top right */}
          <div className="absolute -top-4 -right-4">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Welcome to Extension Testing</h2>
            <p className="text-lg text-gray-600 mb-12 text-center">Here's how to use the testing environment:</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                  <MousePointer className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Interactive Testing</h3>
                <p className="text-gray-600">Click, scroll, and interact with web pages just like a real browser</p>
              </div>
              
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center">
                  <Eye className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Live Preview</h3>
                <p className="text-gray-600">See your extension in action with real-time updates. Experiment with behavior and features.</p>
              </div>
              
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Keyboard className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Keyboard Support</h3>
                <p className="text-gray-600">Use keyboard shortcuts and type naturally</p>
              </div>
            </div>
            
            <div className="mt-12 p-6 bg-blue-50 rounded-lg">
              <p className="text-lg text-blue-800 text-center">
                <strong>Pro tip:</strong> The session will automatically expire after 3 minutes. 
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
