/**
 * Shared AWS credential checks for workflow Lambda + EventBridge Scheduler.
 */

export function hasWorkflowAwsCredentials() {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return true
  }
  if (process.env.AWS_PROFILE?.trim()) {
    return true
  }
  if (process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI) {
    return true
  }
  return false
}

/**
 * @param {string} [action]
 */
export function requireWorkflowAwsCredentials(
  action = "Workflow AWS services",
) {
  if (!hasWorkflowAwsCredentials()) {
    throw new Error(
      `${action} require AWS credentials. Add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to .env.local, or configure an AWS profile (AWS_PROFILE).`,
    )
  }
}
