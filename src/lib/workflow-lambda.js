/**
 * Invoke the workflow runner Lambda (Zillow / demo scenarios).
 */

import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"
import { requireWorkflowAwsCredentials } from "@/lib/workflow-aws-config"

function lambdaClient() {
  const region = process.env.AWS_REGION || "us-east-1"
  return new LambdaClient({
    region,
    credentials:
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
  })
}

/**
 * @param {{ automation_id?: string, scenario_id?: string, params?: object, dry_tools?: boolean }} payload
 */
export async function invokeWorkflowLambda(payload) {
  requireWorkflowAwsCredentials("Manual workflow runs")
  const name = process.env.WORKFLOW_LAMBDA_FUNCTION_NAME
  if (!name) {
    throw new Error(
      "WORKFLOW_LAMBDA_FUNCTION_NAME is not configured in .env.local",
    )
  }

  const client = lambdaClient()
  const command = new InvokeCommand({
    FunctionName: name,
    InvocationType: "Event",
    Payload: Buffer.from(JSON.stringify(payload)),
  })

  const result = await client.send(command)
  if (result.FunctionError) {
    const detail = result.Payload ? Buffer.from(result.Payload).toString("utf8") : ""
    throw new Error(`Lambda invoke failed: ${result.FunctionError} ${detail}`)
  }

  return { statusCode: result.StatusCode }
}
