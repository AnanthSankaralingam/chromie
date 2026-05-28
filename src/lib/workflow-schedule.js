/**
 * Sync automations.schedule_* fields to AWS EventBridge Scheduler.
 */

import {
  SchedulerClient,
  CreateScheduleCommand,
  UpdateScheduleCommand,
  DeleteScheduleCommand,
  GetScheduleCommand,
} from "@aws-sdk/client-scheduler"

function schedulerClient() {
  const region = process.env.AWS_REGION || "us-east-1"
  return new SchedulerClient({
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

function scheduleConfig() {
  const roleArn = process.env.WORKFLOW_SCHEDULER_ROLE_ARN
  const lambdaArn = process.env.WORKFLOW_LAMBDA_ARN
  const groupName = process.env.WORKFLOW_SCHEDULER_GROUP_NAME || "chromie-workflows"
  return { roleArn, lambdaArn, groupName }
}

export function scheduleNameForAutomation(automationId) {
  return `chromie-${automationId}`
}

function requireSchedulerEnv() {
  const { roleArn, lambdaArn } = scheduleConfig()
  if (!roleArn || !lambdaArn) {
    throw new Error(
      "Scheduled runs require WORKFLOW_SCHEDULER_ROLE_ARN and WORKFLOW_LAMBDA_ARN in the Chromie app environment",
    )
  }
  return { roleArn, lambdaArn, groupName: scheduleConfig().groupName }
}

/**
 * Create, update, disable, or delete the EventBridge schedule for an automation row.
 * @param {object} automation - Supabase automations row
 * @returns {Promise<{ eventbridge_schedule_name: string | null }>}
 */
export async function syncAutomationSchedule(automation) {
  const name = scheduleNameForAutomation(automation.id)
  const { groupName } = scheduleConfig()

  if (automation.schedule_kind !== "cron" || !automation.cron_expression?.trim()) {
    await deleteAutomationSchedule(automation.id, name)
    return { eventbridge_schedule_name: null }
  }

  const { roleArn, lambdaArn } = requireSchedulerEnv()
  const client = schedulerClient()
  const expression = automation.cron_expression.trim()
  if (!expression.startsWith("cron(") && !expression.startsWith("rate(")) {
    throw new Error("cron_expression must start with cron( or rate(")
  }

  const input = {
    Name: name,
    GroupName: groupName,
    ScheduleExpression: expression,
    ScheduleExpressionTimezone: automation.schedule_timezone || "UTC",
    FlexibleTimeWindow: { Mode: "OFF" },
    Target: {
      Arn: lambdaArn,
      RoleArn: roleArn,
      Input: JSON.stringify({ automation_id: automation.id }),
    },
    State: automation.enabled === false ? "DISABLED" : "ENABLED",
  }

  try {
    await client.send(new GetScheduleCommand({ Name: name, GroupName: groupName }))
    await client.send(new UpdateScheduleCommand(input))
  } catch (err) {
    if (err.name === "ResourceNotFoundException") {
      await client.send(new CreateScheduleCommand(input))
    } else {
      throw err
    }
  }

  return { eventbridge_schedule_name: name }
}

/**
 * @param {string} automationId
 * @param {string} [knownName]
 */
export async function deleteAutomationSchedule(automationId, knownName) {
  const { groupName } = scheduleConfig()
  const name = knownName || scheduleNameForAutomation(automationId)
  const client = schedulerClient()

  try {
    await client.send(new DeleteScheduleCommand({ Name: name, GroupName: groupName }))
  } catch (err) {
    if (err.name !== "ResourceNotFoundException") {
      throw err
    }
  }
}
