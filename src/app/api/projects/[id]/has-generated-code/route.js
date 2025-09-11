import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request, { params }) {
  try {
    const { id: projectId } = params
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    const supabase = createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the project's has_generated_code status
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('has_generated_code')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError) {
      console.error('Error fetching project:', projectError)
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({
      hasGeneratedCode: project.has_generated_code || false
    })

  } catch (error) {
    console.error('Error checking project has_generated_code status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
