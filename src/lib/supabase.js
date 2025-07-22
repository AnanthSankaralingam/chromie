import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Database types
export const Profile = {
  id: "",
  name: null,
  email: null,
  provider: null,
  stripe_customer_id: null,
  created_at: "",
  last_used_at: "",
}

export const Project = {
  id: "",
  user_id: "",
  name: "",
  description: null,
  created_at: "",
  last_used_at: "",
  archived: false,
}

export const CodeFile = {
  id: "",
  project_id: "",
  file_path: "",
  content: null,
  updated_at: "",
}

export const Conversation = {
  id: "",
  project_id: "",
  role: "",
  content: null,
  created_at: "",
}

export const Subscription = {
  id: "",
  user_id: "",
  stripe_customer_id: null,
  stripe_subscription_id: null,
  plan: "free",
  status: "active",
  created_at: "",
  valid_until: null,
}

// Project management functions
export const projectService = {
  // Get all projects for a user
  async getUserProjects(userId, includeArchived = false) {
    const query = supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("last_used_at", { ascending: false })

    if (!includeArchived) {
      query.eq("archived", false)
    }

    return query
  },

  // Create a new project
  async createProject(userId, name, description) {
    return supabase
      .from("projects")
      .insert([
        {
          user_id: userId,
          name,
          description,
          created_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()
  },

  // Update project
  async updateProject(projectId, updates) {
    return supabase
      .from("projects")
      .update({
        ...updates,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", projectId)
      .select()
      .single()
  },

  // Delete project
  async deleteProject(projectId) {
    return supabase.from("projects").delete().eq("id", projectId)
  },

  // Archive/unarchive project
  async archiveProject(projectId, archived) {
    return supabase.from("projects").update({ archived }).eq("id", projectId)
  },
}

// Code file management functions
export const codeFileService = {
  // Get all files for a project
  async getProjectFiles(projectId) {
    return supabase.from("code_files").select("*").eq("project_id", projectId).order("file_path")
  },

  // Get a specific file
  async getFile(projectId, filePath) {
    return supabase.from("code_files").select("*").eq("project_id", projectId).eq("file_path", filePath).single()
  },

  // Create or update a file
  async upsertFile(projectId, filePath, content) {
    return supabase
      .from("code_files")
      .upsert(
        {
          project_id: projectId,
          file_path: filePath,
          content,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "project_id,file_path",
        },
      )
      .select()
      .single()
  },

  // Delete a file
  async deleteFile(fileId) {
    return supabase.from("code_files").delete().eq("id", fileId)
  },

  // Create default Chrome extension files
  async createDefaultFiles(projectId, projectName) {
    const defaultFiles = [
      {
        file_path: "manifest.json",
        content: JSON.stringify(
          {
            manifest_version: 3,
            name: projectName,
            version: "1.0.0",
            description: "A Chrome extension built with Chromie AI",
            permissions: ["activeTab"],
            action: {
              default_popup: "popup.html",
              default_title: projectName,
            },
            content_scripts: [
              {
                matches: ["<all_urls>"],
                js: ["content.js"],
              },
            ],
          },
          null,
          2,
        ),
      },
      {
        file_path: "popup.html",
        content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${projectName}</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <h1>${projectName}</h1>
    <p>Your Chrome extension is ready!</p>
    <button id="actionBtn">Click me</button>
  </div>
  <script src="popup.js"></script>
</body>
</html>`,
      },
      {
        file_path: "popup.css",
        content: `body {
  width: 300px;
  padding: 0;
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.container {
  padding: 20px;
}

h1 {
  font-size: 18px;
  margin: 0 0 10px 0;
  color: #333;
}

p {
  margin: 0 0 15px 0;
  color: #666;
  font-size: 14px;
}

button {
  background: #4285f4;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

button:hover {
  background: #3367d6;
}`,
      },
      {
        file_path: "popup.js",
        content: `document.addEventListener('DOMContentLoaded', function() {
  const actionBtn = document.getElementById('actionBtn');
  
  actionBtn.addEventListener('click', function() {
    // Send message to content script
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'buttonClicked'});
    });
  });
});`,
      },
      {
        file_path: "content.js",
        content: `// Content script for ${projectName}
console.log('${projectName} content script loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'buttonClicked') {
    console.log('Button clicked in popup!');
    // Add your extension logic here
    sendResponse({status: 'success'});
  }
});`,
      },
    ]

    // Insert all files
    const results = await Promise.all(
      defaultFiles.map((file) =>
        supabase.from("code_files").insert({
          project_id: projectId,
          file_path: file.file_path,
          content: file.content,
          updated_at: new Date().toISOString(),
        }),
      ),
    )

    return results
  },
}

// Conversation management functions
export const conversationService = {
  // Get conversation history for a project
  async getProjectConversations(projectId) {
    return supabase
      .from("conversations")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })
  },

  // Add a message to conversation
  async addMessage(projectId, role, content) {
    return supabase
      .from("conversations")
      .insert([
        {
          project_id: projectId,
          role,
          content,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()
  },

  // Clear conversation history for a project
  async clearProjectConversations(projectId) {
    return supabase.from("conversations").delete().eq("project_id", projectId)
  },

  // Get recent conversations (for context)
  async getRecentConversations(projectId, limit = 10) {
    return supabase
      .from("conversations")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(limit)
  },
}

// Subscription management functions
export const subscriptionService = {
  // Get user's subscription
  async getUserSubscription(userId) {
    return supabase.from("subscriptions").select("*").eq("user_id", userId).single()
  },

  // Create or update subscription
  async upsertSubscription(userId, subscriptionData) {
    return supabase
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          ...subscriptionData,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        },
      )
      .select()
      .single()
  },

  // Check if user has active subscription
  async hasActiveSubscription(userId) {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .single()

    if (error || !data) return false

    // Check if subscription is still valid
    if (data.valid_until) {
      const validUntil = new Date(data.valid_until)
      const now = new Date()
      return validUntil > now
    }

    return data.status === "active"
  },

  // Get subscription limits
  async getSubscriptionLimits(userId) {
    const { data } = await this.getUserSubscription(userId)

    if (!data || data.plan === "free") {
      return {
        maxProjects: 3,
        maxGenerationsPerMonth: 3,
        hasAdvancedFeatures: false,
      }
    }

    if (data.plan === "pro") {
      return {
        maxProjects: 50,
        maxGenerationsPerMonth: 1000,
        hasAdvancedFeatures: true,
      }
    }

    if (data.plan === "enterprise") {
      return {
        maxProjects: -1, // unlimited
        maxGenerationsPerMonth: -1, // unlimited
        hasAdvancedFeatures: true,
      }
    }

    return {
      maxProjects: 3,
      maxGenerationsPerMonth: 3,
      hasAdvancedFeatures: false,
    }
  },
}
