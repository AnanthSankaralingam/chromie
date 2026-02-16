export const NEW_TAB_FRONTEND_MODULE = `
<new_tab_implementation_requirements>

<manifest_configuration>
Required manifest.json sections:
{
  "chrome_url_overrides": {
    "newtab": "newtab.html"
  },
  "permissions": ["storage"]
}
</manifest_configuration>
</new_tab_implementation_requirements>
`
