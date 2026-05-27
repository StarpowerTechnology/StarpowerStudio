import { useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { LoadingOverlay, LoadingScreen } from './components/common/LoadingScreen'
import { StudioLayout } from './components/studio/StudioLayout'
import type { StudioRoute } from './components/studio/StudioSidebar'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import {
  checkUsernameAvailable,
  fetchProfile,
  normalizeUsername,
  resolveLoginEmail,
  saveProfile,
  type Profile,
} from './lib/account-data'
import {
  createStarterProjects,
  fetchOwnedProjects,
  fetchPublicProjects,
  getCreatorName,
  hasPendingLocalMigration,
  loadLocalProjects,
  makeId,
  markLocalMigrationComplete,
  starterProjects,
  syncOwnedProjects,
  type Conversation,
  type DatasetMessage,
  type Project,
  type Role,
} from './lib/studio-data'
import { AccountPage } from './pages/AccountPage'
import { DatasetEditorPage } from './pages/DatasetEditorPage'
import { JupyterNotebookPage } from './pages/JupyterNotebookPage'
import { LandingPage } from './pages/LandingPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { PublicPage } from './pages/PublicPage'
import { StudioHomePage } from './pages/StudioHomePage'
import { StudioPlaceholderPage } from './pages/StudioPlaceholderPage'

const fallbackPublicDatasets = [
  { name: 'WVY Dataset', creator: 'Spaceman' },
  { name: 'Savvy Dataset', creator: 'StarPower Tech' },
  { name: 'Creative Thinker Dataset', creator: 'User 304' },
  { name: 'Spaceman Dataset', creator: 'Spaceman' },
]

type AppRoute = 'landing' | StudioRoute

const ROUTE_PATHS: Record<AppRoute, string> = {
  landing: '/',
  studio: '/studio',
  'dataset-editor': '/dataset-editor',
  'jupyter-notebook': '/jupyter-notebook',
  public: '/public',
  projects: '/projects',
  account: '/account',
  'image-database': '/image-database',
  'music-database': '/music-database',
}

function normalizePath(pathname: string) {
  return pathname.replace(/\/+$/, '') || '/'
}

function getAppRoute(): AppRoute {
  const path = normalizePath(window.location.pathname)
  if (path === '/login') return 'account'

  for (const [route, routePath] of Object.entries(ROUTE_PATHS) as Array<[AppRoute, string]>) {
    if (path === routePath) return route
  }

  return 'landing'
}

function getSessionFromUrlHash() {
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash) return null

  const params = new URLSearchParams(hash)
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')

  if (!accessToken && !refreshToken) return null

  return {
    accessToken,
    refreshToken,
  }
}

function clearUrlHash() {
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured)
  const [dataLoading, setDataLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileError, setProfileError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saveStatus, setSaveStatus] = useState('Saved')
  const [route, setRoute] = useState<AppRoute>(() => getAppRoute())
  const [projects, setProjects] = useState<Project[]>(starterProjects)
  const [publicProjects, setPublicProjects] = useState(fallbackPublicDatasets)
  const [activeProjectId, setActiveProjectId] = useState(starterProjects[0].id)
  const [activeConversationId, setActiveConversationId] = useState(starterProjects[0].conversations[0].id)
  const [nextRole, setNextRole] = useState<Role>('user')
  const [draft, setDraft] = useState('')
  const dataReadyRef = useRef(false)

  function navigateRoute(nextRoute: AppRoute, historyMode: 'push' | 'replace' = 'push') {
    setRoute(nextRoute)

    const nextPath = ROUTE_PATHS[nextRoute]
    if (normalizePath(window.location.pathname) === nextPath) return

    const method = historyMode === 'replace' ? 'replaceState' : 'pushState'
    window.history[method](null, '', nextPath)
  }

  function navigateStudioRoute(nextRoute: StudioRoute) {
    navigateRoute(nextRoute)
  }

  useEffect(() => {
    if (!supabase) {
      return
    }
    const client = supabase

    async function loadSession() {
      const hashSession = getSessionFromUrlHash()

      try {
        if (hashSession) {
          if (!hashSession.accessToken || !hashSession.refreshToken) {
            throw new Error('Could not finish sign in. Please try logging in again.')
          }

          const { data, error } = await client.auth.setSession({
            access_token: hashSession.accessToken,
            refresh_token: hashSession.refreshToken,
          })

          if (error) throw error

          setUser(data.session?.user ?? null)
          if (data.session?.user) {
            navigateRoute('account', 'replace')
          }
          clearUrlHash()
          return
        }

        const { data, error } = await client.auth.getSession()
        if (error) throw error

        const session = data.session
        setUser(session?.user ?? null)
      } catch (error) {
        setUser(null)
        setAuthError(error instanceof Error ? error.message : 'Could not finish sign in.')
        if (hashSession) clearUrlHash()
      } finally {
        setAuthLoading(false)
      }
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthError('')
      if (!session?.user) {
        setProfile(null)
        setProfileError('')
      }
      if (session?.user && getAppRoute() === 'landing') {
        navigateRoute('studio', 'replace')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (normalizePath(window.location.pathname) === '/login') {
      window.history.replaceState(null, '', ROUTE_PATHS.account)
    }
  }, [])

  useEffect(() => {
    function handlePopState() {
      setRoute(getAppRoute())
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      return
    }

    let canceled = false
    const currentUser = user

    async function loadProfile() {
      setProfileError('')
      try {
        const currentProfile = await fetchProfile(currentUser.id)
        if (canceled) return

        if (currentProfile) {
          setProfile(currentProfile)
          return
        }

        const metadataUsername = normalizeUsername(String(currentUser.user_metadata?.username ?? ''))
        if (metadataUsername) {
          const { profile: savedProfile, user: updatedUser } = await saveProfile(currentUser, {
            username: metadataUsername,
            email: currentUser.email ?? '',
          })
          if (canceled) return
          setProfile(savedProfile)
          setUser(updatedUser)
          return
        }

        setProfile(null)
      } catch (error) {
        if (canceled) return
        setProfileError(error instanceof Error ? error.message : 'Could not load your profile.')
      }
    }

    loadProfile()

    return () => {
      canceled = true
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      dataReadyRef.current = false
      return
    }

    let canceled = false
    const currentUser = user

    async function loadCloudProjects() {
      setDataLoading(true)
      setSaveError('')
      dataReadyRef.current = false

      try {
        const cloudProjects = await fetchOwnedProjects(currentUser.id)
        const creator = getCreatorName(currentUser)
        const localProjects = hasPendingLocalMigration(currentUser.id) ? loadLocalProjects() : []
        const nextProjects =
          cloudProjects.length > 0 || localProjects.length > 0
            ? [...cloudProjects, ...localProjects]
            : createStarterProjects(creator)

        if (localProjects.length > 0) {
          markLocalMigrationComplete(currentUser.id)
        }

        if (canceled) return
        setProjects(nextProjects)
        setActiveProjectId(nextProjects[0]?.id ?? '')
        setActiveConversationId(nextProjects[0]?.conversations[0]?.id ?? '')
        dataReadyRef.current = true
        setSaveStatus(localProjects.length > 0 ? 'Imported browser projects' : 'Saved')
      } catch (error) {
        if (canceled) return
        setSaveError(error instanceof Error ? error.message : 'Could not load your projects.')
      } finally {
        if (!canceled) setDataLoading(false)
      }
    }

    loadCloudProjects()

    return () => {
      canceled = true
    }
  }, [user])

  useEffect(() => {
    if (!user || !dataReadyRef.current) return

    setSaveStatus('Saving...')
    const timeout = window.setTimeout(() => {
      syncOwnedProjects(user.id, projects)
        .then(() => {
          setSaveStatus('Saved')
          setSaveError('')
        })
        .catch((error) => {
          setSaveStatus('Not saved')
          setSaveError(error instanceof Error ? error.message : 'Could not save your projects.')
        })
    }, 700)

    return () => window.clearTimeout(timeout)
  }, [projects, user])

  useEffect(() => {
    if (!user || route !== 'public') return

    fetchPublicProjects()
      .then((items) => {
        setPublicProjects(items.length > 0 ? items : fallbackPublicDatasets)
      })
      .catch(() => setPublicProjects(fallbackPublicDatasets))
  }, [route, user])

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0]
  const activeConversation =
    activeProject?.conversations.find((conversation) => conversation.id === activeConversationId) ??
    activeProject?.conversations[0]

  function updateActiveProject(updater: (project: Project) => Project) {
    setProjects((currentProjects) =>
      currentProjects.map((project) => (project.id === activeProjectId ? updater(project) : project)),
    )
  }

  function updateActiveConversation(updater: (conversation: Conversation) => Conversation) {
    updateActiveProject((project) => ({
      ...project,
      conversations: project.conversations.map((conversation) =>
        conversation.id === activeConversationId ? updater(conversation) : conversation,
      ),
    }))
  }

  function openEditor(projectId = activeProjectId) {
    const project = projects.find((item) => item.id === projectId)
    if (!project) return
    setActiveProjectId(project.id)
    setActiveConversationId(project.conversations[0]?.id ?? '')
    navigateRoute('dataset-editor')
  }

  function addMessage() {
    if (!draft.trim() || !activeConversation) return
    const messageRole = nextRole
    updateActiveConversation((conversation) => ({
      ...conversation,
      messages: [...conversation.messages, { id: makeId(), role: messageRole, content: draft.trim() }],
    }))
    setDraft('')
    if (messageRole === 'user') {
      setNextRole('assistant')
    }
    if (messageRole === 'assistant') {
      setNextRole('user')
    }
  }

  function insertMessageAfter(messageId: string) {
    updateActiveConversation((conversation) => {
      const index = conversation.messages.findIndex((message) => message.id === messageId)
      const newMessage: DatasetMessage = { id: makeId(), role: nextRole, content: '' }
      const messages = [...conversation.messages]
      messages.splice(index + 1, 0, newMessage)
      return { ...conversation, messages }
    })
  }

  function updateMessage(messageId: string, patch: Partial<DatasetMessage>) {
    updateActiveConversation((conversation) => ({
      ...conversation,
      messages: conversation.messages.map((message) =>
        message.id === messageId ? { ...message, ...patch } : message,
      ),
    }))
  }

  function deleteMessage(messageId: string) {
    updateActiveConversation((conversation) => ({
      ...conversation,
      messages: conversation.messages.filter((message) => message.id !== messageId),
    }))
  }

  function moveMessage(messageId: string, direction: -1 | 1) {
    updateActiveConversation((conversation) => {
      const index = conversation.messages.findIndex((message) => message.id === messageId)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= conversation.messages.length) return conversation

      const messages = [...conversation.messages]
      const [message] = messages.splice(index, 1)
      messages.splice(nextIndex, 0, message)
      return { ...conversation, messages }
    })
  }

  function createProject() {
    const project: Project = {
      id: makeId(),
      name: `Dataset Project ${projects.length + 1}`,
      creator: getCreatorName(user),
      isPublic: false,
      conversations: [{ id: makeId(), title: 'Conversation 1', messages: [] }],
    }
    setProjects((currentProjects) => [...currentProjects, project])
    setActiveProjectId(project.id)
    setActiveConversationId(project.conversations[0].id)
    navigateRoute('dataset-editor')
  }

  function exportJsonl() {
    if (!activeProject) return
    const lines = activeProject.conversations.map((conversation) =>
      JSON.stringify({
        messages: conversation.messages
          .filter((message) => message.content.trim())
          .map((message) => ({ role: message.role, content: message.content.trim() })),
      }),
    )

    const blob = new Blob([lines.join('\n')], { type: 'application/jsonl;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${activeProject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.jsonl`
    link.click()
    URL.revokeObjectURL(url)
  }

  function toggleProjectVisibility(projectId: string, isPublic: boolean) {
    setProjects((currentProjects) =>
      currentProjects.map((project) => (project.id === projectId ? { ...project, isPublic } : project)),
    )
  }

  async function handleUsernameCheck(username: string) {
    if (!supabase) {
      throw new Error('Supabase is not configured.')
    }

    return checkUsernameAvailable(username, user?.id)
  }

  async function handleEmailLogin(identifier: string, password: string) {
    if (!supabase) {
      setAuthError('Supabase is not configured.')
      return
    }
    setAuthError('')
    const email = await resolveLoginEmail(identifier)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setAuthError(error.message)
      return
    }
    setUser(data.user)
    navigateRoute('account')
  }

  async function handleEmailSignup(username: string, email: string, password: string) {
    if (!supabase) {
      setAuthError('Supabase is not configured.')
      return
    }
    setAuthError('')
    const normalizedUsername = normalizeUsername(username)
    const usernameAvailable = await checkUsernameAvailable(normalizedUsername)
    if (!usernameAvailable) {
      setAuthError('Username is taken.')
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: normalizedUsername },
        emailRedirectTo: `${window.location.origin}${ROUTE_PATHS.account}`,
      },
    })
    if (error) {
      setAuthError(error.message)
      return
    }

    if (data.user && data.session) {
      const { profile: savedProfile, user: updatedUser } = await saveProfile(data.user, {
        username: normalizedUsername,
        email,
      })
      setProfile(savedProfile)
      setUser(updatedUser)
      navigateRoute('account')
      return
    }

    setAuthError('Check your email to confirm your account, then log in.')
  }

  async function handleGoogleLogin() {
    if (!supabase) {
      setAuthError('Supabase is not configured.')
      return
    }
    setAuthError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${ROUTE_PATHS.account}`,
      },
    })
    if (error) setAuthError(error.message)
  }

  async function handleSaveUsername(username: string) {
    if (!user) return
    setProfileError('')

    try {
      const normalizedUsername = normalizeUsername(username)
      const usernameAvailable = await checkUsernameAvailable(normalizedUsername, user.id)
      if (!usernameAvailable) {
        setProfileError('Username is taken.')
        return
      }

      const { profile: savedProfile, user: updatedUser } = await saveProfile(user, {
        username: normalizedUsername,
        email: user.email ?? '',
        bio: profile?.bio ?? '',
        photoUrl: profile?.photoUrl ?? '',
      })
      setProfile(savedProfile)
      setUser(updatedUser)
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Could not save username.')
    }
  }

  async function handleSignOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    setProfile(null)
    setProjects(starterProjects)
    navigateRoute('account', 'replace')
  }

  if (route === 'landing') {
    return <LandingPage openAccount={() => navigateRoute('account')} openStudio={() => navigateRoute('studio')} />
  }

  if (authLoading) {
    return <LoadingScreen label="Loading account..." />
  }

  return (
    <StudioLayout activeRoute={route} navigate={navigateStudioRoute}>
      {route === 'studio' && (
        <StudioHomePage
          openDatasetEditor={() => openEditor()}
          openJupyterNotebook={() => navigateRoute('jupyter-notebook')}
          openImageDatabase={() => navigateRoute('image-database')}
          openMusicDatabase={() => navigateRoute('music-database')}
        />
      )}
      {route === 'dataset-editor' && activeProject && activeConversation && (
        <DatasetEditorPage
          activeProject={activeProject}
          activeConversation={activeConversation}
          nextRole={nextRole}
          setNextRole={setNextRole}
          draft={draft}
          setDraft={setDraft}
          saveStatus={saveStatus}
          saveError={saveError}
          navigate={navigateStudioRoute}
          toggleProjectVisibility={toggleProjectVisibility}
          addMessage={addMessage}
          insertMessageAfter={insertMessageAfter}
          updateMessage={updateMessage}
          deleteMessage={deleteMessage}
          moveMessage={moveMessage}
          exportJsonl={exportJsonl}
        />
      )}
      {route === 'jupyter-notebook' && <JupyterNotebookPage />}
      {route === 'public' && <PublicPage datasets={publicProjects} />}
      {route === 'projects' && <ProjectsPage projects={projects} openProject={openEditor} createProject={createProject} />}
      {route === 'account' && (
        <AccountPage
          authError={authError}
          profile={profile}
          profileError={profileError}
          saveStatus={saveStatus}
          user={user}
          onCheckUsername={handleUsernameCheck}
          onEmailLogin={handleEmailLogin}
          onEmailSignup={handleEmailSignup}
          onGoogleLogin={handleGoogleLogin}
          onSaveUsername={handleSaveUsername}
          onSignOut={handleSignOut}
        />
      )}
      {route === 'image-database' && (
        <StudioPlaceholderPage title="IMG Database" detail="This studio tool is a future workspace." />
      )}
      {route === 'music-database' && (
        <StudioPlaceholderPage title="Music Database" detail="This studio tool is a future workspace." />
      )}
      {dataLoading && <LoadingOverlay label="Loading your cloud projects..." />}
    </StudioLayout>
  )
}

export default App
