// unified-schemas.js
// Centralized schema management for the unified LLM service
import { 
  selectResponseSchema as selectGeminiSchema, 
  convertToOpenAIFormat as convertGeminiToOpenAI 
} from './gemini-response-schemas.js'
import { 
  selectResponseSchema as selectOpenAISchema, 
  convertToOpenAIFormat as convertOpenAIToOpenAI 
} from './openai-response-schemas.js'

/**
 * Selects the appropriate unified schema based on provider, frontend type, and request type
 * Always returns an OpenAI-compatible format regardless of the provider
 * @param {string} provider - The LLM provider ('openai', 'anthropic', 'gemini')
 * @param {string} frontendType - The frontend type (side_panel, popup, overlay, generic)
 * @param {string} requestType - The request type (NEW_EXTENSION, ADD_TO_EXISTING)
 * @returns {Object} OpenAI-compatible response schema
 */
export function selectUnifiedSchema(provider, frontendType, requestType) {
  console.log('[unified-schemas] Selecting schema', {
    provider,
    frontendType,
    requestType
  })

  try {
    let nativeSchema

    // Get the native schema from the appropriate provider
    switch (provider.toLowerCase()) {
      case 'openai':
        nativeSchema = selectOpenAISchema(frontendType, requestType)
        return convertOpenAIToOpenAI(nativeSchema)
      
      case 'anthropic':
        // Anthropic uses OpenAI-compatible format, so we can use OpenAI schemas
        nativeSchema = selectOpenAISchema(frontendType, requestType)
        return convertOpenAIToOpenAI(nativeSchema)
      
      case 'gemini':
        nativeSchema = selectGeminiSchema(frontendType, requestType)
        return convertGeminiToOpenAI(nativeSchema)
      
      default:
        console.warn(`[unified-schemas] Unknown provider '${provider}', falling back to OpenAI format`)
        nativeSchema = selectOpenAISchema(frontendType, requestType)
        return convertOpenAIToOpenAI(nativeSchema)
    }
  } catch (error) {
    console.error('[unified-schemas] Error selecting schema:', error)
    // Fallback to OpenAI format
    const fallbackSchema = selectOpenAISchema(frontendType, requestType)
    return convertOpenAIToOpenAI(fallbackSchema)
  }
}

/**
 * Get all available schema types for a provider
 * @param {string} provider - The LLM provider
 * @returns {Array<string>} List of available schema types
 */
export function getAvailableSchemaTypes(provider) {
  const schemaTypes = [
    { frontendType: 'side_panel', requestType: 'NEW_EXTENSION' },
    { frontendType: 'popup', requestType: 'NEW_EXTENSION' },
    { frontendType: 'overlay', requestType: 'NEW_EXTENSION' },
    { frontendType: 'generic', requestType: 'NEW_EXTENSION' },
    { frontendType: 'side_panel', requestType: 'ADD_TO_EXISTING' },
    { frontendType: 'popup', requestType: 'ADD_TO_EXISTING' },
    { frontendType: 'overlay', requestType: 'ADD_TO_EXISTING' },
    { frontendType: 'generic', requestType: 'ADD_TO_EXISTING' }
  ]

  return schemaTypes.map(({ frontendType, requestType }) => ({
    frontendType,
    requestType,
    schema: selectUnifiedSchema(provider, frontendType, requestType)
  }))
}

/**
 * Validate that a schema is in OpenAI-compatible format
 * @param {Object} schema - Schema to validate
 * @returns {boolean} Whether the schema is valid
 */
export function validateOpenAIFormat(schema) {
  if (!schema || typeof schema !== 'object') {
    return false
  }

  if (!schema.name || typeof schema.name !== 'string') {
    return false
  }

  if (!schema.schema || typeof schema.schema !== 'object') {
    return false
  }

  const { schema: schemaDef } = schema

  // Check required fields
  if (schemaDef.type !== 'object') {
    return false
  }

  if (!schemaDef.properties || typeof schemaDef.properties !== 'object') {
    return false
  }

  if (!Array.isArray(schemaDef.required)) {
    return false
  }

  if (typeof schemaDef.additionalProperties !== 'boolean') {
    return false
  }

  return true
}

/**
 * Get schema metadata for debugging and logging
 * @param {Object} schema - Schema object
 * @returns {Object} Schema metadata
 */
export function getSchemaMetadata(schema) {
  if (!validateOpenAIFormat(schema)) {
    return { valid: false, error: 'Invalid schema format' }
  }

  const { schema: schemaDef } = schema
  const properties = Object.keys(schemaDef.properties || {})
  const required = schemaDef.required || []

  return {
    valid: true,
    name: schema.name,
    type: schemaDef.type,
    propertyCount: properties.length,
    requiredCount: required.length,
    optionalCount: properties.length - required.length,
    properties: properties,
    required: required,
    allowsAdditionalProperties: schemaDef.additionalProperties
  }
}

/**
 * Compare two schemas to see if they're equivalent
 * @param {Object} schema1 - First schema
 * @param {Object} schema2 - Second schema
 * @returns {boolean} Whether the schemas are equivalent
 */
export function compareSchemas(schema1, schema2) {
  if (!validateOpenAIFormat(schema1) || !validateOpenAIFormat(schema2)) {
    return false
  }

  const meta1 = getSchemaMetadata(schema1)
  const meta2 = getSchemaMetadata(schema2)

  return (
    meta1.name === meta2.name &&
    meta1.propertyCount === meta2.propertyCount &&
    meta1.requiredCount === meta2.requiredCount &&
    JSON.stringify(meta1.properties.sort()) === JSON.stringify(meta2.properties.sort()) &&
    JSON.stringify(meta1.required.sort()) === JSON.stringify(meta2.required.sort())
  )
}

/**
 * Get a human-readable description of a schema
 * @param {Object} schema - Schema object
 * @returns {string} Human-readable description
 */
export function describeSchema(schema) {
  const metadata = getSchemaMetadata(schema)
  
  if (!metadata.valid) {
    return `Invalid schema: ${metadata.error}`
  }

  const { name, propertyCount, requiredCount, properties, required } = metadata
  
  let description = `Schema "${name}" with ${propertyCount} properties`
  
  if (requiredCount > 0) {
    description += ` (${requiredCount} required: ${required.join(', ')})`
  }
  
  if (propertyCount > requiredCount) {
    const optional = properties.filter(p => !required.includes(p))
    description += ` (${optional.length} optional: ${optional.join(', ')})`
  }
  
  return description
}

// Export individual schema selection functions for backward compatibility
export { selectGeminiSchema, selectOpenAISchema }

export default {
  selectUnifiedSchema,
  getAvailableSchemaTypes,
  validateOpenAIFormat,
  getSchemaMetadata,
  compareSchemas,
  describeSchema
}
