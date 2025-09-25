// Test script to verify schema selection is working correctly
import { selectResponseSchema } from '../../src/lib/codegen/response-schemas.js'

console.log('Testing schema selection...\n')

// Test cases
const testCases = [
  { frontendType: 'side_panel', requestType: 'NEW_EXTENSION', expected: 'sidepanel.html, sidepanel.js' },
  { frontendType: 'popup', requestType: 'NEW_EXTENSION', expected: 'popup.html, popup.js' },
  { frontendType: 'overlay', requestType: 'NEW_EXTENSION', expected: 'overlay.html, overlay.js' },
  { frontendType: 'generic', requestType: 'NEW_EXTENSION', expected: 'all files (generic)' },
  { frontendType: 'side_panel', requestType: 'ADD_TO_EXISTING', expected: 'manifest.json only' },
  { frontendType: 'popup', requestType: 'ADD_TO_EXISTING', expected: 'manifest.json only' },
  { frontendType: 'unknown', requestType: 'NEW_EXTENSION', expected: 'generic schema' }
]

testCases.forEach(({ frontendType, requestType, expected }) => {
  const schema = selectResponseSchema(frontendType, requestType)
  const requiredFields = schema.schema.required
  const additionalProperties = schema.schema.additionalProperties
  
  console.log(`Frontend: ${frontendType}, Request: ${requestType}`)
  console.log(`Required fields: ${requiredFields.join(', ')}`)
  console.log(`Allows additional files: ${additionalProperties}`)
  console.log(`Expected: ${expected}`)
  console.log('---')
})

console.log('Schema selection test completed!')
