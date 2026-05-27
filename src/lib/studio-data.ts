import type { User } from '@supabase/supabase-js'
import { requireSupabase } from './supabase'

export type Role = 'user' | 'assistant' | 'system'
export type StatsMode = 'words' | 'letters' | 'bpe'

export type DatasetMessage = {
  id: string
  role: Role
  content: string
}

export type Conversation = {
  id: string
  title: string
  messages: DatasetMessage[]
}

export type Project = {
  id: string
  name: string
  creator: string
  isPublic: boolean
  conversations: Conversation[]
}

type ProjectRow = {
  id: string
  user_id: string
  name: string
  creator: string
  is_public: boolean
  created_at?: string
  updated_at?: string
}

type ConversationRow = {
  id: string
  project_id: string
  title: string
  position: number
}

type MessageRow = {
  id: string
  conversation_id: string
  role: Role
  content: string
  position: number
}

export const STORAGE_KEY = 'starpower-studio-projects'
export const MIGRATION_KEY = 'starpower-studio-projects-migrated'

export function makeId() {
  return crypto.randomUUID()
}

export function getCreatorName(user: User | null) {
  return (
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email?.split('@')[0] ??
    'StarPower Tech'
  )
}

export const starterProjects: Project[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'StarPower Training Dataset',
    creator: 'StarPower Tech',
    isPublic: false,
    conversations: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        title: 'Conversation 1',
        messages: [
          {
            id: '33333333-3333-4333-8333-333333333333',
            role: 'user',
            content: 'Write the user message here.',
          },
          {
            id: '44444444-4444-4444-8444-444444444444',
            role: 'assistant',
            content: 'Write the assistant response here.',
          },
        ],
      },
    ],
  },
]

export function loadLocalProjects() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return []
    const parsed = JSON.parse(saved) as Array<Partial<Project>>

    return parsed.map((project) => ({
      id: makeId(),
      name: project.name ?? 'Imported Dataset Project',
      creator: project.creator ?? 'StarPower Tech',
      isPublic: Boolean(project.isPublic),
      conversations:
        project.conversations?.map((conversation) => ({
          id: makeId(),
          title: conversation.title ?? 'Conversation',
          messages:
            conversation.messages?.map((message) => ({
              id: makeId(),
              role: message.role ?? 'user',
              content: message.content ?? '',
            })) ?? [],
        })) ?? [],
    }))
  } catch {
    return []
  }
}

export function createStarterProjects(creator: string): Project[] {
  return [
    {
      id: makeId(),
      name: 'StarPower Training Dataset',
      creator,
      isPublic: false,
      conversations: [
        {
          id: makeId(),
          title: 'Conversation 1',
          messages: [
            { id: makeId(), role: 'user', content: 'Write the user message here.' },
            { id: makeId(), role: 'assistant', content: 'Write the assistant response here.' },
          ],
        },
      ],
    },
  ]
}

export function hasPendingLocalMigration(userId: string) {
  return loadLocalProjects().length > 0 && window.localStorage.getItem(MIGRATION_KEY) !== userId
}

export function markLocalMigrationComplete(userId: string) {
  window.localStorage.setItem(MIGRATION_KEY, userId)
}

export async function fetchOwnedProjects(userId: string) {
  const client = requireSupabase()
  const { data: projectRows, error: projectsError } = await client
    .from('projects')
    .select('id,user_id,name,creator,is_public,created_at,updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (projectsError) throw projectsError
  if (!projectRows?.length) return []

  return fetchProjectsByRows(projectRows as ProjectRow[])
}

export async function fetchPublicProjects() {
  const client = requireSupabase()
  const { data, error } = await client
    .from('projects')
    .select('id,user_id,name,creator,is_public,created_at,updated_at')
    .eq('is_public', true)
    .order('updated_at', { ascending: false })
    .limit(24)

  if (error) throw error

  return (data as ProjectRow[] | null)?.map((project) => ({
    id: project.id,
    name: project.name,
    creator: project.creator,
  })) ?? []
}

async function fetchProjectsByRows(projectRows: ProjectRow[]) {
  const client = requireSupabase()
  const projectIds = projectRows.map((project) => project.id)
  const { data: conversationRows, error: conversationsError } = await client
    .from('conversations')
    .select('id,project_id,title,position')
    .in('project_id', projectIds)
    .order('position', { ascending: true })

  if (conversationsError) throw conversationsError

  const conversations = (conversationRows ?? []) as ConversationRow[]
  const conversationIds = conversations.map((conversation) => conversation.id)
  const messagesByConversation = new Map<string, DatasetMessage[]>()

  if (conversationIds.length > 0) {
    const { data: messageRows, error: messagesError } = await client
      .from('messages')
      .select('id,conversation_id,role,content,position')
      .in('conversation_id', conversationIds)
      .order('position', { ascending: true })

    if (messagesError) throw messagesError

    for (const message of (messageRows ?? []) as MessageRow[]) {
      const messages = messagesByConversation.get(message.conversation_id) ?? []
      messages.push({ id: message.id, role: message.role, content: message.content })
      messagesByConversation.set(message.conversation_id, messages)
    }
  }

  const conversationsByProject = new Map<string, Conversation[]>()
  for (const conversation of conversations) {
    const projectConversations = conversationsByProject.get(conversation.project_id) ?? []
    projectConversations.push({
      id: conversation.id,
      title: conversation.title,
      messages: messagesByConversation.get(conversation.id) ?? [],
    })
    conversationsByProject.set(conversation.project_id, projectConversations)
  }

  return projectRows.map((project) => ({
    id: project.id,
    name: project.name,
    creator: project.creator,
    isPublic: project.is_public,
    conversations: conversationsByProject.get(project.id) ?? [],
  }))
}

export async function syncOwnedProjects(userId: string, projects: Project[]) {
  const client = requireSupabase()
  const projectRows = projects.map((project) => ({
    id: project.id,
    user_id: userId,
    name: project.name,
    creator: project.creator,
    is_public: project.isPublic,
  }))

  const { data: existingProjects, error: existingProjectsError } = await client
    .from('projects')
    .select('id')
    .eq('user_id', userId)

  if (existingProjectsError) throw existingProjectsError

  const projectIds = projectRows.map((project) => project.id)
  const projectIdsToDelete = (existingProjects ?? [])
    .map((project) => project.id as string)
    .filter((id) => !projectIds.includes(id))

  if (projectIdsToDelete.length > 0) {
    const { error } = await client.from('projects').delete().in('id', projectIdsToDelete)
    if (error) throw error
  }

  if (projectRows.length > 0) {
    const { error } = await client.from('projects').upsert(projectRows)
    if (error) throw error
  }

  const conversationRows = projects.flatMap((project) =>
    project.conversations.map((conversation, position) => ({
      id: conversation.id,
      project_id: project.id,
      title: conversation.title,
      position,
    })),
  )

  if (projectIds.length > 0) {
    const { data: existingConversations, error: existingConversationsError } = await client
      .from('conversations')
      .select('id,project_id')
      .in('project_id', projectIds)

    if (existingConversationsError) throw existingConversationsError

    const conversationIds = conversationRows.map((conversation) => conversation.id)
    const conversationIdsToDelete = (existingConversations ?? [])
      .map((conversation) => conversation.id as string)
      .filter((id) => !conversationIds.includes(id))

    if (conversationIdsToDelete.length > 0) {
      const { error } = await client.from('conversations').delete().in('id', conversationIdsToDelete)
      if (error) throw error
    }
  }

  if (conversationRows.length > 0) {
    const { error } = await client.from('conversations').upsert(conversationRows)
    if (error) throw error
  }

  const messageRows = projects.flatMap((project) =>
    project.conversations.flatMap((conversation) =>
      conversation.messages.map((message, position) => ({
        id: message.id,
        conversation_id: conversation.id,
        role: message.role,
        content: message.content,
        position,
      })),
    ),
  )

  const conversationIds = conversationRows.map((conversation) => conversation.id)
  if (conversationIds.length > 0) {
    const { data: existingMessages, error: existingMessagesError } = await client
      .from('messages')
      .select('id,conversation_id')
      .in('conversation_id', conversationIds)

    if (existingMessagesError) throw existingMessagesError

    const messageIds = messageRows.map((message) => message.id)
    const messageIdsToDelete = (existingMessages ?? [])
      .map((message) => message.id as string)
      .filter((id) => !messageIds.includes(id))

    if (messageIdsToDelete.length > 0) {
      const { error } = await client.from('messages').delete().in('id', messageIdsToDelete)
      if (error) throw error
    }
  }

  if (messageRows.length > 0) {
    const { error } = await client.from('messages').upsert(messageRows)
    if (error) throw error
  }
}
