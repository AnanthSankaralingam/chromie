import { useState, useRef, useEffect } from "react"

export default function useResizablePanels() {
  const [dividerPosition, setDividerPosition] = useState(() => {
    // Load saved divider position from localStorage, default to 25 (smallest)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chromie_divider_position')
      const position = saved ? parseFloat(saved) : 25
      console.log('Initial divider position loaded:', position)
      return position
    }
    return 25
  })
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef(null)

  const handleMouseDown = (e) => {
    setIsDragging(true)
    e.preventDefault()
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !containerRef.current) return

      const container = containerRef.current
      const rect = container.getBoundingClientRect()
      const newPosition = ((e.clientX - rect.left) / rect.width) * 100

      const constrainedPosition = Math.min(Math.max(newPosition, 25), 45)
      console.log('Setting divider position to:', constrainedPosition)
      setDividerPosition(constrainedPosition)
      // Save to localStorage
      localStorage.setItem('chromie_divider_position', constrainedPosition.toString())
      console.log('Saved to localStorage:', constrainedPosition)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging])

  const ResizableDivider = () => (
    <div
      className="w-1 bg-gradient-to-b from-purple-500/20 to-blue-500/20 hover:from-purple-500/40 hover:to-blue-500/40 cursor-col-resize transition-all duration-300 relative group"
      onMouseDown={handleMouseDown}
    >
      <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-gradient-to-b group-hover:from-purple-500/10 group-hover:to-blue-500/10 transition-all duration-300" />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-12 bg-gradient-to-b from-purple-500/30 to-blue-500/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    </div>
  )

  return {
    dividerPosition,
    containerRef,
    ResizableDivider
  }
} 