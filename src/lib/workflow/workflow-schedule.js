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
import {
  hasWorkflowAwsCredentials,
  requireWorkflowAwsCredentials,
} from "@/lib/workflow/workflow-aws-config"
import { buildCronExpressions } from "@/lib/workflow/workflow-schedule-cron"

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

export function scheduleNameForAutomation(automationId, index = 0) {
  return index === 0 ? `chromie-${automationId}` : `chromie-${automationId}-${index}`
}

const MAX_EXTRA_SCHEDULE_SLOTS = 12

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
 * @param {string} automationId
 * @param {number} [maxIndex]
 */
export async function deleteAutomationSchedules(automationId, maxIndex = MAX_EXTRA_SCHEDULE_SLOTS) {
  if (!hasWorkflowAwsCredentials()) {
    console.warn(
      "[workflow-schedule] Skipping EventBridge schedule cleanup — AWS credentials not configured",
    )
    return
  }

  const { groupName } = scheduleConfig()
  const client = schedulerClient()

  for (let i = 0; i <= maxIndex; i++) {
    const name = scheduleNameForAutomation(automationId, i)
    try {
      await client.send(new DeleteScheduleCommand({ Name: name, GroupName: groupName }))
    } catch (err) {
      if (err.name !== "ResourceNotFoundException") {
        throw err
      }
    }
  }
}

/** @deprecated Use deleteAutomationSchedules */
export async function deleteAutomationSchedule(automationId, knownName) {
  if (knownName) {
    const { groupName } = scheduleConfig()
    const client = schedulerClient()
    try {
      await client.send(new DeleteScheduleCommand({ Name: knownName, GroupName: groupName }))
    } catch (err) {
      if (err.name !== "ResourceNotFoundException") throw err
    }
  }
  await deleteAutomationSchedules(automationId)
}

/**
 * @param {object} automation
 * @returns {Promise<{ eventbridge_schedule_name: string | null }>}
 */
export async function syncAutomationSchedule(automation) {
  requireWorkflowAwsCredentials("Scheduled workflow runs")
  const { groupName } = scheduleConfig()

  if (automation.schedule_kind !== "cron" || !automation.cron_expression?.trim()) {
    await deleteAutomationSchedules(automation.id)
    return { eventbridge_schedule_name: null }
  }

  const { roleArn, lambdaArn } = requireSchedulerEnv()
  const client = schedulerClient()

  const expressions = automation.cron_expression.includes("|")
    ? automation.cron_expression.split("|").map((s) => s.trim())
    : [automation.cron_expression.trim()]

  for (const expression of expressions) {
    if (!expression.startsWith("cron(") && !expression.startsWith("rate(")) {
      throw new Error("cron_expression must use cron(...) or rate(...)")
    }
  }

  const baseInput = {
    GroupName: groupName,
    ScheduleExpressionTimezone: automation.schedule_timezone || "UTC",
    FlexibleTimeWindow: { Mode: "OFF" },
    Target: {
      Arn: lambdaArn,
      RoleArn: roleArn,
      Input: JSON.stringify({ automation_id: automation.id }),
    },
    State: automation.enabled === false ? "DISABLED" : "ENABLED",
  }

  for (let i = 0; i < expressions.length; i++) {
    const name = scheduleNameForAutomation(automation.id, i)
    const input = {
      ...baseInput,
      Name: name,
      ScheduleExpression: expressions[i],
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
  }

  for (let i = expressions.length; i <= MAX_EXTRA_SCHEDULE_SLOTS; i++) {
    const name = scheduleNameForAutomation(automation.id, i)
    try {
      await client.send(new DeleteScheduleCommand({ Name: name, GroupName: groupName }))
    } catch (err) {
      if (err.name !== "ResourceNotFoundException") throw err
    }
  }

  return { eventbridge_schedule_name: scheduleNameForAutomation(automation.id) }
}

/**
 * Build stored cron_expression (pipe-separated when multiple AWS schedules are required).
 * @param {object} scheduleInput
 */
export function cronExpressionFromScheduleInput(scheduleInput) {
  const expressions = buildCronExpressions(scheduleInput)
  return expressions.join("|")
}
