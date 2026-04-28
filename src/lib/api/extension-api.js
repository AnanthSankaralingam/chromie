import { NextResponse } from "next/server"

const DEFAULT_ALLOWED_ORIGINS = [
  "chrome-extension://",
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.NEXT_PUBLIC_BASE_URL,
].filter(Boolean)

export function isAllowedExtensionOrigin(origin) {
  if (!origin) return true
  const configuredOrigin = process.env.CHROMIE_EXTENSION_ORIGIN
  if (configuredOrigin && origin === configuredOrigin) return true
  const configuredId = process.env.CHROMIE_EXTENSION_ID
  if (configuredId && origin === `chrome-extension://${configuredId}`) return true
  return DEFAULT_ALLOWED_ORIGINS.some((allowed) => origin === allowed || origin.startsWith(allowed))
}

export function extensionCorsHeaders(request) {
  const origin = request?.headers?.get("origin") || ""
  const allowOrigin = isAllowedExtensionOrigin(origin) ? origin || "*" : "null"

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  }
}

export function extensionJson(request, body, init = {}) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...extensionCorsHeaders(request),
      ...(init.headers || {}),
    },
  })
}

export function extensionOptions(request) {
  return new NextResponse(null, {
    status: 204,
    headers: extensionCorsHeaders(request),
  })
}
