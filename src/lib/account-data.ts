import type { User } from '@supabase/supabase-js'
import { requireSupabase } from './supabase'

export type Profile = {
  id: string
  username: string
  email: string
  bio: string
  photoUrl: string
}

type ProfileRow = {
  id: string
  username: string | null
  email: string | null
  bio: string | null
  photo_url: string | null
}

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
}

export function getProfileUsername(user: User | null, profile: Profile | null) {
  return (
    profile?.username ||
    user?.user_metadata?.username ||
    user?.user_metadata?.preferred_username ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'starpower-user'
  )
}

export function getProfilePhoto(user: User | null, profile: Profile | null) {
  return profile?.photoUrl || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''
}

export async function fetchProfile(userId: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('profiles')
    .select('id,username,email,bio,photo_url')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return mapProfile(data as ProfileRow)
}

export async function checkUsernameAvailable(username: string, currentUserId?: string) {
  const normalizedUsername = normalizeUsername(username)
  if (normalizedUsername.length < 3) return false

  const client = requireSupabase()
  const { data, error } = await client
    .from('profiles')
    .select('id')
    .eq('username', normalizedUsername)
    .maybeSingle()

  if (error) throw error
  return !data || data.id === currentUserId
}

export async function resolveLoginEmail(identifier: string) {
  const value = identifier.trim()
  if (value.includes('@')) return value

  const username = normalizeUsername(value)
  if (!username) return value

  const client = requireSupabase()
  const { data, error } = await client
    .from('profiles')
    .select('email')
    .eq('username', username)
    .maybeSingle()

  if (error) throw error
  return (data?.email as string | undefined) ?? value
}

export async function saveProfile(user: User, profile: Pick<Profile, 'username'> & Partial<Profile>) {
  const client = requireSupabase()
  const username = normalizeUsername(profile.username)

  const { data, error } = await client
    .from('profiles')
    .upsert(
      {
        id: user.id,
        username,
        email: profile.email ?? user.email ?? '',
        bio: profile.bio ?? '',
        photo_url: profile.photoUrl ?? getProfilePhoto(user, null),
      },
      { onConflict: 'id' },
    )
    .select('id,username,email,bio,photo_url')
    .single()

  if (error) throw error

  const { data: authData, error: authError } = await client.auth.updateUser({
    data: { username },
  })

  if (authError) throw authError
  return { profile: mapProfile(data as ProfileRow), user: authData.user }
}

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username ?? '',
    email: row.email ?? '',
    bio: row.bio ?? '',
    photoUrl: row.photo_url ?? '',
  }
}
