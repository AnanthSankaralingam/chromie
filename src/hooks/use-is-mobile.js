"use client"

import { useEffect, useState } from "react"

export function useIsMobile(breakpointPx = 640) {
	const [isMobile, setIsMobile] = useState(false)

	useEffect(() => {
		const check = () => {
			try {
				if (typeof window === "undefined") return
				const matches = window.matchMedia(`(max-width: ${breakpointPx}px)`).matches
				setIsMobile(matches)
			} catch (e) {
				setIsMobile(false)
			}
		}

		check()
		window.addEventListener("resize", check)
		return () => window.removeEventListener("resize", check)
	}, [breakpointPx])

	return isMobile
}

