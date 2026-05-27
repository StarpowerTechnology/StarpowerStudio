import { useEffect, useMemo, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { LoadingOverlay, LoadingScreen } from './components/common/LoadingScreen'
import { SetupScreen } from './components/common/SetupScreen'
import { StudioLayout } from './components/studio/StudioLayout'
import type { StudioRoute } from './components/studio/StudioSidebar'
import { isSupabaseConfigured, supabase } from './lib/supabase'
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
  type StatsMode,
} from './lib/studio-data'
import { AccountPage } from './pages/AccountPage'
import { DatasetEditorPage } from './pages/DatasetEditorPage'
import { JupyterNotebookPage } from './pages/JupyterNotebookPage'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
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

type AppRoute = 'landing' | 'login' | StudioRoute

const ROUTE_PATHS: Record<AppRoute, string> = {
  landing: '/',
  login: '/login',
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

  for (const [route, routePath] of Object.entries(ROUTE_PATHS) as Array<[AppRoute, string]>) {
    if (path === routePath) return route
  }

  return 'landing'
}

function isStudioRoute(route: AppRoute): route is StudioRoute {
  return route !== 'landing' && route !== 'login'
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

function getAllText(projects: Project[]) {
  return projects
    .flatMap((project) => project.conversations)
    .flatMap((conversation) => conversation.messages)
    .map((message) => message.content)
    .join(' ')
}

function getWords(text: string) {
  return text.toLowerCase().match(/[a-z0-9']+/g) ?? []
}

function countUsage(items: string[]) {
  return items.reduce<Record<string, number>>((accumulator, item) => {
    accumulator[item] = (accumulator[item] ?? 0) + 1
    return accumulator
  }, {})
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [skipAuth, setSkipAuth] = useState(false)
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured)
  const [dataLoading, setDataLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saveStatus, setSaveStatus] = useState('Saved')
  const [route, setRoute] = useState<AppRoute>(() => getAppRoute())
  const [projects, setProjects] = useState<Project[]>(starterProjects)
  const [publicProjects, setPublicProjects] = useState(fallbackPublicDatasets)
  const [activeProjectId, setActiveProjectId] = useState(starterProjects[0].id)
  const [activeConversationId, setActiveConversationId] = useState(starterProjects[0].conversations[0].id)
  const [nextRole, setNextRole] = useState<Role>('user')
  const [draft, setDraft] = useState('')
  const [statsMode, setStatsMode] = useState<StatsMode>('words')
  const dataReadyRef = useRef(false)
  const skipAuthRef = useRef(false)
  const canUseStudio = Boolean(user) || skipAuth

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
            navigateRoute('studio', 'replace')
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
      if (session?.user) {
        if (getAppRoute() === 'login') {
          navigateRoute('studio', 'replace')
        }
      } else if (!skipAuthRef.current && isStudioRoute(getAppRoute())) {
        navigateRoute('login', 'replace')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    function handlePopState() {
      setRoute(getAppRoute())
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (authLoading) return

    const timeout = window.setTimeout(() => {
      if (!canUseStudio && isStudioRoute(route)) {
        navigateRoute('login', 'replace')
      }
      if (user && route === 'login') {
        navigateRoute('studio', 'replace')
      }
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [authLoading, canUseStudio, route, user])

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

  const stats = useMemo(() => {
    const text = getAllText(projects)
    const words = getWords(text)
    const letters = text.toLowerCase().replace(/[^a-z0-9]/g, '').split('')

    return {
      totalCharacters: text.replace(/\s/g, '').length,
      totalWords: words.length,
      words: Object.entries(countUsage(words)).sort((a, b) => b[1] - a[1]),
      letters: Object.entries(countUsage(letters)).sort((a, b) => b[1] - a[1]),
    }
  }, [projects])

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

  function addConversation() {
    const newConversation: Conversation = {
      id: makeId(),
      title: `Conversation ${activeProject.conversations.length + 1}`,
      messages: [],
    }

    updateActiveProject((project) => ({
      ...project,
      conversations: [...project.conversations, newConversation],
    }))
    setActiveConversationId(newConversation.id)
  }

  function renameConversation(conversationId: string) {
    const conversation = activeProject.conversations.find((item) => item.id === conversationId)
    const title = window.prompt('Rename conversation', conversation?.title ?? '')
    if (!title?.trim()) return

    updateActiveProject((project) => ({
      ...project,
      conversations: project.conversations.map((item) =>
        item.id === conversationId ? { ...item, title: title.trim() } : item,
      ),
    }))
  }

  function deleteConversation(conversationId: string) {
    if (activeProject.conversations.length === 1) return
    const nextConversations = activeProject.conversations.filter((conversation) => conversation.id !== conversationId)
    updateActiveProject((project) => ({ ...project, conversations: nextConversations }))
    if (conversationId === activeConversationId) {
      setActiveConversationId(nextConversations[0]?.id ?? '')
    }
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

  async function handleEmailLogin(email: string, password: string) {
    if (!supabase) return
    setAuthError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setAuthError(error.message)
      return
    }
    skipAuthRef.current = false
    setSkipAuth(false)
    setUser(data.user)
    navigateRoute('studio')
  }

  function handleSkipLogin() {
    setAuthError('')
    skipAuthRef.current = true
    setSkipAuth(true)
    navigateRoute('studio')
  }

  async function handleEmailSignup(email: string, password: string) {
    if (!supabase) return
    setAuthError('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${ROUTE_PATHS.studio}`,
      },
    })
    if (error) {
      setAuthError(error.message)
      return
    }
    setAuthError('Check your email to confirm your account, then log in.')
  }

  async function handleGoogleLogin() {
    if (!supabase) return
    setAuthError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${ROUTE_PATHS.studio}`,
      },
    })
    if (error) setAuthError(error.message)
  }

  async function handleSignOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    skipAuthRef.current = false
    setSkipAuth(false)
    setProjects(starterProjects)
    navigateRoute('landing', 'replace')
  }

  if (route === 'landing') {
    return <LandingPage openLogin={() => navigateRoute('login')} />
  }

  if (authLoading) {
    return <LoadingScreen label="Loading account..." />
  }

  if (route === 'login') {
    return (
      <LoginPage
        authError={authError}
        onEmailLogin={handleEmailLogin}
        onEmailSignup={handleEmailSignup}
        onGoogleLogin={handleGoogleLogin}
        onSkipLogin={handleSkipLogin}
      />
    )
  }

  if (!isSupabaseConfigured && !skipAuth) {
    return <SetupScreen />
  }

  if (!canUseStudio) {
    return <LoadingScreen label="Opening login..." />
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
          stats={stats}
          statsMode={statsMode}
          setStatsMode={setStatsMode}
          saveStatus={saveStatus}
          saveError={saveError}
          addConversation={addConversation}
          renameConversation={renameConversation}
          deleteConversation={deleteConversation}
          setActiveConversationId={setActiveConversationId}
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
      {route === 'account' && user && <AccountPage user={user} saveStatus={saveStatus} onSignOut={handleSignOut} />}
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
