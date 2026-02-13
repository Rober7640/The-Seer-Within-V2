// Supabase client and conversation storage

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface ConversationRecord {
  id?: string
  email: string
  first_name: string
  location?: string
  time_of_day?: string
  bucket?: string
  sub_bucket?: string
  person_name?: string
  concern?: string
  deeper_response?: string
  vision?: string
  emotional_response?: string
  block_source?: string
  commitment_response?: string
  purchased?: boolean
  purchase_type?: string
  objection_count?: number
  conversation_state?: string
  messages?: string // JSON stringified messages array
}

// Create or update conversation record
export async function saveConversation(data: ConversationRecord): Promise<string | null> {
  try {
    // Check if conversation exists for this email
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('email', data.email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('conversations')
        .update(data)
        .eq('id', existing.id)

      if (error) {
        console.error('Supabase update error:', error)
        return null
      }
      return existing.id
    } else {
      // Insert new record
      const { data: inserted, error } = await supabase
        .from('conversations')
        .insert(data)
        .select('id')
        .single()

      if (error) {
        console.error('Supabase insert error:', error)
        return null
      }
      return inserted?.id || null
    }
  } catch (error) {
    console.error('Supabase error:', error)
    return null
  }
}

// Get conversation by email (for cross-device restore)
export async function getConversationByEmail(email: string): Promise<ConversationRecord | null> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return null
    }

    return data as ConversationRecord
  } catch (error) {
    console.error('Supabase fetch error:', error)
    return null
  }
}

// Mark conversation as purchased
export async function markPurchased(email: string, purchaseType: 'main' | 'downsell'): Promise<void> {
  try {
    await supabase
      .from('conversations')
      .update({ purchased: true, purchase_type: purchaseType })
      .eq('email', email)
  } catch (error) {
    console.error('Supabase purchase update error:', error)
  }
}
