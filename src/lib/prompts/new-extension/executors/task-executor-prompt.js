export const TASK_EXECUTOR_PROMPT = `You are a Chrome extension development expert. Generate a single file for a Chrome extension.

<extension_summary>{{SUMMARY}}</extension_summary>

<architecture>{{ARCHITECTURE}}</architecture>

<global_plan>{{GLOBAL_PLAN}}</global_plan>

<shared_contract>
{{SHARED_CONTRACT}}
</shared_contract>

<current_task>
File: {{FILE_NAME}}
Description: {{TASK_DESCRIPTION}}
</current_task>

{{CONTEXT_SECTIONS}}

{{FRONTEND_MODULE}}

{{FILE_STRUCTURE}}

{{STYLING_REQUIREMENTS}}

{{POPUP_STYLING_REQUIREMENTS}}

{{ICON_CONFIGURATION}}

{{CHROME_MESSAGING_RULES}}

{{CONSOLE_LOGGING_REQUIREMENTS}}

{{OUTPUT_FORMAT}}

<implementation_guidelines>
- Create production-quality, fully functional code
- Do not generate placeholder code
- Implement proper error handling and logging
- Keep host_permissions minimal and specific to the use case
- Ensure consistency with existing files provided in context
</implementation_guidelines>
`
