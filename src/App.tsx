import { useEffect, useMemo, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Database,
  Download,
  Edit3,
  Folder,
  Globe2,
  Home,
  Image,
  LogIn,
  Music,
  NotebookTabs,
  Plus,
  Send,
  Share2,
  Trash2,
  UserCircle,
} from 'lucide-react'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Input } from './components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select'
import { Textarea } from './components/ui/textarea'
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
  type Page,
  type Project,
  type Role,
  type StatsMode,
} from './lib/studio-data'
import { cn } from './lib/utils'

const fallbackPublicDatasets = [
  { name: 'WVY Dataset', creator: 'Spaceman' },
  { name: 'Savvy Dataset', creator: 'StarPower Tech' },
  { name: 'Creative Thinker Dataset', creator: 'User 304' },
  { name: 'Spaceman Dataset', creator: 'Spaceman' },
]

const LOGIN_PATH = '/login'
const STUDIO_PATH = '/studio'

type AppRoute = 'landing' | 'login' | 'studio'

function normalizePath(pathname: string) {
  return pathname.replace(/\/+$/, '') || '/'
}

function getAppRoute(): AppRoute {
  const path = normalizePath(window.location.pathname)
  if (path === LOGIN_PATH) return 'login'
  if (path === STUDIO_PATH) return 'studio'
  return 'landing'
}

function getRoutePath(route: AppRoute) {
  if (route === 'login') return LOGIN_PATH
  if (route === 'studio') return STUDIO_PATH
  return '/'
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
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured)
  const [dataLoading, setDataLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saveStatus, setSaveStatus] = useState('Saved')
  const [route, setRoute] = useState<AppRoute>(() => getAppRoute())
  const [page, setPage] = useState<Page>('home')
  const [placeholderTitle, setPlaceholderTitle] = useState('')
  const [projects, setProjects] = useState<Project[]>(starterProjects)
  const [publicProjects, setPublicProjects] = useState(fallbackPublicDatasets)
  const [activeProjectId, setActiveProjectId] = useState(starterProjects[0].id)
  const [activeConversationId, setActiveConversationId] = useState(starterProjects[0].conversations[0].id)
  const [nextRole, setNextRole] = useState<Role>('user')
  const [draft, setDraft] = useState('')
  const [statsMode, setStatsMode] = useState<StatsMode>('words')
  const dataReadyRef = useRef(false)

  function navigateRoute(nextRoute: AppRoute, historyMode: 'push' | 'replace' = 'push') {
    setRoute(nextRoute)

    if (nextRoute === 'studio') {
      setPage('home')
    }

    const nextPath = getRoutePath(nextRoute)
    if (normalizePath(window.location.pathname) === nextPath) return

    const method = historyMode === 'replace' ? 'replaceState' : 'pushState'
    window.history[method](null, '', nextPath)
  }

  function setStudioPage(nextPage: Page) {
    setPage(nextPage)

    if (getAppRoute() !== 'studio') {
      navigateRoute('studio')
    }
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
      } else {
        if (getAppRoute() === 'studio') {
          navigateRoute('login', 'replace')
        }
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
      if (!user && route === 'studio') {
        navigateRoute('login', 'replace')
      }
      if (user && route === 'login') {
        navigateRoute('studio', 'replace')
      }
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [authLoading, route, user])

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
    if (!user || page !== 'public') return

    fetchPublicProjects()
      .then((items) => {
        setPublicProjects(items.length > 0 ? items : fallbackPublicDatasets)
      })
      .catch(() => setPublicProjects(fallbackPublicDatasets))
  }, [page, user])

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
    setStudioPage('editor')
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
      messages: [
        ...conversation.messages,
        { id: makeId(), role: messageRole, content: draft.trim() },
      ],
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
    setStudioPage('editor')
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
      currentProjects.map((project) =>
        project.id === projectId ? { ...project, isPublic } : project,
      ),
    )
  }

  async function handleEmailLogin(email: string, password: string) {
    if (!supabase) return
    setAuthError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setAuthError(error.message)
      return
    }
    navigateRoute('studio', 'replace')
  }

  async function handleEmailSignup(email: string, password: string) {
    if (!supabase) return
    setAuthError('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${STUDIO_PATH}`,
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
        redirectTo: `${window.location.origin}${STUDIO_PATH}`,
      },
    })
    if (error) setAuthError(error.message)
  }

  async function handleSignOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    setProjects(starterProjects)
    navigateRoute('landing', 'replace')
  }

  if (route === 'landing') {
    return <LandingScreen openLogin={() => navigateRoute('login')} />
  }

  if (authLoading) {
    return <LoadingScreen label="Loading account..." />
  }

  if (route === 'login') {
    return (
      <LoginScreen
        authError={authError}
        onEmailLogin={handleEmailLogin}
        onEmailSignup={handleEmailSignup}
        onGoogleLogin={handleGoogleLogin}
      />
    )
  }

  if (!isSupabaseConfigured) {
    return <SetupScreen />
  }

  if (!user) {
    return <LoadingScreen label="Opening login..." />
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[250px_1fr]">
        <Sidebar page={page} setPage={setStudioPage} />
        <main className="min-w-0 border-white/20 md:border-l">
          {page === 'home' && (
            <HomeScreen
              openEditor={() => openEditor()}
              openPlaceholder={(title) => {
                setPlaceholderTitle(title)
                setStudioPage('placeholder')
              }}
            />
          )}
          {page === 'public' && <PublicScreen datasets={publicProjects} />}
          {page === 'projects' && (
            <ProjectsScreen projects={projects} openProject={openEditor} createProject={createProject} />
          )}
          {page === 'editor' && activeProject && activeConversation && (
            <DatasetEditor
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
          {page === 'account' && <AccountScreen user={user} saveStatus={saveStatus} onSignOut={handleSignOut} />}
          {page === 'placeholder' && (
            <PlaceholderScreen title={placeholderTitle} detail="This studio tool is a future workspace." />
          )}
          {dataLoading && <LoadingOverlay label="Loading your cloud projects..." />}
        </main>
      </div>
    </div>
  )
}

function LandingScreen({ openLogin }: { openLogin: () => void }) {
  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <header className="flex justify-end">
        <Button variant="outline" onClick={openLogin}>
          Login
        </Button>
      </header>
      <section className="flex min-h-[calc(100vh-96px)] flex-col items-center justify-center gap-8 text-center">
        <h1 className="text-5xl font-semibold tracking-normal md:text-7xl">Starpower Technology</h1>
        <img className="h-28 w-28 object-contain md:h-36 md:w-36" src="/brand/starpower-logo.png" alt="StarPower logo" />
      </section>
    </main>
  )
}

function LoginScreen({
  authError,
  onEmailLogin,
  onEmailSignup,
  onGoogleLogin,
}: {
  authError: string
  onEmailLogin: (email: string, password: string) => Promise<void>
  onEmailSignup: (email: string, password: string) => Promise<void>
  onGoogleLogin: () => Promise<void>
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loadingAction, setLoadingAction] = useState<'login' | 'signup' | 'google' | null>(null)

  async function submit(action: 'login' | 'signup' | 'google') {
    setLoadingAction(action)
    try {
      if (action === 'login') await onEmailLogin(email.trim(), password)
      if (action === 'signup') await onEmailSignup(email.trim(), password)
      if (action === 'google') await onGoogleLogin()
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
      <section className="flex w-full max-w-xl flex-col items-center gap-7 text-center">
        <img className="h-24 w-24 object-contain" src="/brand/starpower-logo.png" alt="StarPower seven point star" />
        <div>
          <h1 className="text-4xl font-semibold tracking-normal md:text-6xl">StarPower Studio</h1>
        </div>
        <div className="grid w-full gap-4">
          <Input
            aria-label="email"
            autoComplete="email"
            inputMode="email"
            placeholder="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            aria-label="password"
            autoComplete="current-password"
            placeholder="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit('login')
            }}
          />
          {authError && (
            <Card className="border-white/40 p-3 text-sm text-white/70">
              {authError}
            </Card>
          )}
          <Button className="h-12 text-base" onClick={() => submit('login')} disabled={loadingAction !== null}>
            <LogIn /> {loadingAction === 'login' ? 'Logging in...' : 'Login'}
          </Button>
          <Button className="h-12 text-base" variant="outline" onClick={() => submit('signup')} disabled={loadingAction !== null}>
            {loadingAction === 'signup' ? 'Creating account...' : 'Sign up'}
          </Button>
          <Button className="h-12 text-base" variant="outline" onClick={() => submit('google')} disabled={loadingAction !== null}>
            <UserCircle /> {loadingAction === 'google' ? 'Opening Google...' : 'Continue with Google'}
          </Button>
        </div>
      </section>
    </main>
  )
}

function Sidebar({ page, setPage }: { page: Page; setPage: (page: Page) => void }) {
  const navItems = [
    { page: 'home' as Page, label: 'Home', icon: Home },
    { page: 'public' as Page, label: 'Public', icon: Globe2 },
    { page: 'projects' as Page, label: 'Projects', icon: Folder },
  ]

  return (
    <aside className="flex min-h-28 flex-col border-b border-white/20 p-5 md:min-h-screen md:border-b-0">
      <div className="mb-8 flex items-center gap-3">
        <img className="h-10 w-10 object-contain" src="/brand/starpower-logo.png" alt="" />
        <div className="text-sm font-semibold uppercase leading-tight tracking-normal">
          StarPower
          <br />
          Studio
        </div>
      </div>
      <nav className="grid gap-2">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.page}
              className={cn(
                'flex items-center gap-3 rounded-md border border-transparent px-3 py-3 text-left text-lg transition hover:border-white/30 hover:bg-white/5',
                page === item.page && 'border-white/40 bg-white/10',
              )}
              onClick={() => setPage(item.page)}
              type="button"
            >
              <Icon className="h-6 w-6" />
              {item.label}
            </button>
          )
        })}
      </nav>
      <button
        className={cn(
          'mt-6 flex items-center gap-3 rounded-md border border-transparent px-3 py-3 text-left text-lg transition hover:border-white/30 hover:bg-white/5 md:mt-auto',
          page === 'account' && 'border-white/40 bg-white/10',
        )}
        onClick={() => setPage('account')}
        type="button"
      >
        <UserCircle className="h-8 w-8" />
        Account
      </button>
    </aside>
  )
}

function HomeScreen({
  openEditor,
  openPlaceholder,
}: {
  openEditor: () => void
  openPlaceholder: (title: string) => void
}) {
  const tools = [
    { title: 'Dataset Editor', icon: Database, action: openEditor },
    { title: 'Jupyter Notebook', icon: NotebookTabs, action: () => openPlaceholder('Jupyter Notebook') },
    { title: 'IMG Database', icon: Image, action: () => openPlaceholder('IMG Database') },
    { title: 'Music Database', icon: Music, action: () => openPlaceholder('Music Database') },
  ]

  return (
    <section className="p-6 md:p-10">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold">Home</h2>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {tools.map((tool) => {
          const Icon = tool.icon
          return (
            <button key={tool.title} className="text-left" onClick={tool.action} type="button">
              <Card className="min-h-56 transition hover:bg-white hover:text-black">
                <CardHeader>
                  <Icon className="mb-8 h-9 w-9" />
                  <CardTitle className="text-3xl">{tool.title}</CardTitle>
                </CardHeader>
              </Card>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function PublicScreen({ datasets }: { datasets: Array<{ name: string; creator: string }> }) {
  return (
    <section className="p-6 md:p-10">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold">Public</h2>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {datasets.map((dataset) => (
          <Card key={dataset.name} className="min-h-52">
            <CardHeader>
              <CardTitle className="text-3xl">{dataset.name}</CardTitle>
              <CardDescription className="text-base">{dataset.creator}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  )
}

function ProjectsScreen({
  projects,
  openProject,
  createProject,
}: {
  projects: Project[]
  openProject: (projectId: string) => void
  createProject: () => void
}) {
  return (
    <section className="p-6 md:p-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-3xl font-semibold">Projects</h2>
        <Button onClick={createProject}>
          <Plus /> New project
        </Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {projects.map((project) => (
          <Card key={project.id} className="min-h-44">
            <CardHeader>
              <CardTitle className="text-2xl">{project.name}</CardTitle>
              <CardDescription>{project.conversations.length} conversations</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => openProject(project.id)}>
                Open <ArrowUpRight />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}

function DatasetEditor({
  activeProject,
  activeConversation,
  nextRole,
  setNextRole,
  draft,
  setDraft,
  stats,
  statsMode,
  setStatsMode,
  saveStatus,
  saveError,
  addConversation,
  renameConversation,
  deleteConversation,
  setActiveConversationId,
  toggleProjectVisibility,
  addMessage,
  insertMessageAfter,
  updateMessage,
  deleteMessage,
  moveMessage,
  exportJsonl,
}: {
  activeProject: Project
  activeConversation: Conversation
  nextRole: Role
  setNextRole: (role: Role) => void
  draft: string
  setDraft: (draft: string) => void
  stats: {
    totalCharacters: number
    totalWords: number
    words: [string, number][]
    letters: [string, number][]
  }
  statsMode: StatsMode
  setStatsMode: (mode: StatsMode) => void
  saveStatus: string
  saveError: string
  addConversation: () => void
  renameConversation: (conversationId: string) => void
  deleteConversation: (conversationId: string) => void
  setActiveConversationId: (conversationId: string) => void
  toggleProjectVisibility: (projectId: string, isPublic: boolean) => void
  addMessage: () => void
  insertMessageAfter: (messageId: string) => void
  updateMessage: (messageId: string, patch: Partial<DatasetMessage>) => void
  deleteMessage: (messageId: string) => void
  moveMessage: (messageId: string, direction: -1 | 1) => void
  exportJsonl: () => void
}) {
  const messageEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [activeConversation.id, activeConversation.messages.length])

  return (
    <section className="grid h-screen min-h-[780px] grid-rows-[auto_1fr_auto]">
      <header className="flex flex-col gap-4 border-b border-white/20 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase text-white/50">Dataset Editor</p>
          <h2 className="text-2xl font-semibold">{activeProject.name}</h2>
          <p className={cn('mt-2 text-sm', saveError ? 'text-red-300' : 'text-white/50')}>
            {saveError || saveStatus}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant={activeProject.isPublic ? 'default' : 'outline'}
            onClick={() => toggleProjectVisibility(activeProject.id, !activeProject.isPublic)}
          >
            <Share2 /> {activeProject.isPublic ? 'Public' : 'Private'}
          </Button>
          <Button onClick={exportJsonl}>
            <Download /> Export JSONL
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 grid-cols-1 lg:grid-cols-[240px_1fr_280px]">
        <ConversationPanel
          conversations={activeProject.conversations}
          activeConversationId={activeConversation.id}
          addConversation={addConversation}
          renameConversation={renameConversation}
          deleteConversation={deleteConversation}
          setActiveConversationId={setActiveConversationId}
        />

        <div className="min-h-0 overflow-y-auto border-white/20 p-5 lg:border-x">
          <div className="grid gap-5">
            {activeConversation.messages.length === 0 && (
              <Card className="border-dashed p-8 text-center text-white/60">
                Start this conversation with the input bar below.
              </Card>
            )}
            {activeConversation.messages.map((message, index) => (
              <MessageCard
                key={message.id}
                message={message}
                isFirst={index === 0}
                isLast={index === activeConversation.messages.length - 1}
                insertMessageAfter={insertMessageAfter}
                updateMessage={updateMessage}
                deleteMessage={deleteMessage}
                moveMessage={moveMessage}
              />
            ))}
            <div ref={messageEndRef} />
          </div>
        </div>

        <StatsPanel stats={stats} statsMode={statsMode} setStatsMode={setStatsMode} />
      </div>

      <footer className="border-t border-white/20 p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <Select value={nextRole} onValueChange={(value) => setNextRole(value as Role)}>
            <SelectTrigger className="lg:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">user</SelectItem>
              <SelectItem value="assistant">assistant</SelectItem>
              <SelectItem value="system">system</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            className="min-h-14 flex-1 resize-none"
            placeholder="type here"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                addMessage()
              }
            }}
          />
          <Button className="h-14 lg:w-16" onClick={addMessage} size="icon" aria-label="send message">
            <Send />
          </Button>
        </div>
      </footer>
    </section>
  )
}

function ConversationPanel({
  conversations,
  activeConversationId,
  addConversation,
  renameConversation,
  deleteConversation,
  setActiveConversationId,
}: {
  conversations: Conversation[]
  activeConversationId: string
  addConversation: () => void
  renameConversation: (conversationId: string) => void
  deleteConversation: (conversationId: string) => void
  setActiveConversationId: (conversationId: string) => void
}) {
  return (
    <aside className="min-h-0 overflow-y-auto border-b border-white/20 p-4 lg:border-b-0">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="font-semibold">Conversations</h3>
        <Button variant="outline" size="icon" onClick={addConversation} aria-label="new conversation">
          <Plus />
        </Button>
      </div>
      <div className="grid gap-2">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={cn(
              'rounded-md border border-white/20 p-3',
              conversation.id === activeConversationId && 'border-white bg-white/10',
            )}
          >
            <button
              className="mb-3 w-full text-left text-sm font-medium"
              type="button"
              onClick={() => setActiveConversationId(conversation.id)}
            >
              {conversation.title}
            </button>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => renameConversation(conversation.id)} aria-label="rename">
                <Edit3 />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteConversation(conversation.id)}
                aria-label="delete conversation"
                disabled={conversations.length === 1}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

function MessageCard({
  message,
  isFirst,
  isLast,
  insertMessageAfter,
  updateMessage,
  deleteMessage,
  moveMessage,
}: {
  message: DatasetMessage
  isFirst: boolean
  isLast: boolean
  insertMessageAfter: (messageId: string) => void
  updateMessage: (messageId: string, patch: Partial<DatasetMessage>) => void
  deleteMessage: (messageId: string) => void
  moveMessage: (messageId: string, direction: -1 | 1) => void
}) {
  return (
    <Card className={cn('max-w-3xl', message.role === 'assistant' && 'ml-auto border-white/60')}>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 pb-3">
        <Select value={message.role} onValueChange={(value) => updateMessage(message.id, { role: value as Role })}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">user</SelectItem>
            <SelectItem value="assistant">assistant</SelectItem>
            <SelectItem value="system">system</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => insertMessageAfter(message.id)} aria-label="insert message">
            <Plus />
          </Button>
          <Button variant="ghost" size="icon" aria-label="edit message">
            <Edit3 />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => moveMessage(message.id, -1)} disabled={isFirst} aria-label="move up">
            <ArrowUp />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => moveMessage(message.id, 1)} disabled={isLast} aria-label="move down">
            <ArrowDown />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => deleteMessage(message.id)} aria-label="delete message">
            <Trash2 />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          className="resize-y border-white/20"
          value={message.content}
          placeholder="write message"
          onChange={(event) => updateMessage(message.id, { content: event.target.value })}
        />
      </CardContent>
    </Card>
  )
}

function StatsPanel({
  stats,
  statsMode,
  setStatsMode,
}: {
  stats: {
    totalCharacters: number
    totalWords: number
    words: [string, number][]
    letters: [string, number][]
  }
  statsMode: StatsMode
  setStatsMode: (mode: StatsMode) => void
}) {
  const usage = statsMode === 'letters' ? stats.letters : stats.words

  return (
    <aside className="min-h-0 overflow-y-auto p-4">
      <h3 className="mb-4 font-semibold">Stats</h3>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Card className="p-3">
          <p className="text-xs uppercase text-white/50">Characters</p>
          <p className="text-2xl font-semibold">{stats.totalCharacters}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs uppercase text-white/50">Words</p>
          <p className="text-2xl font-semibold">{stats.totalWords}</p>
        </Card>
      </div>
      <Select value={statsMode} onValueChange={(value) => setStatsMode(value as StatsMode)}>
        <SelectTrigger className="mb-4">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="words">words</SelectItem>
          <SelectItem value="letters">letters</SelectItem>
          <SelectItem value="bpe">BPE</SelectItem>
        </SelectContent>
      </Select>
      {statsMode === 'bpe' ? (
        <Card className="p-4 text-sm text-white/60">BPE/token-style counting placeholder.</Card>
      ) : (
        <Card className="p-3">
          <div className="mb-3 text-sm font-medium">{statsMode === 'letters' ? 'Letter usage' : 'Word usage'}</div>
          <div className="grid max-h-80 gap-2 overflow-y-auto pr-1 text-sm">
            {usage.length === 0 && <p className="text-white/50">No usage yet.</p>}
            {usage.slice(0, 60).map(([item, count]) => (
              <div key={item} className="flex items-center justify-between border-b border-white/10 pb-1">
                <span className="truncate">{item}</span>
                <span className="text-white/60">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </aside>
  )
}

function AccountScreen({
  user,
  saveStatus,
  onSignOut,
}: {
  user: User
  saveStatus: string
  onSignOut: () => Promise<void>
}) {
  return (
    <section className="p-6 md:p-10">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold">Account</h2>
      </div>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">{user.email ?? getCreatorName(user)}</CardTitle>
          <CardDescription className="text-base">
            Cloud sync is {saveStatus.toLowerCase()}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="rounded-md border border-white/15 p-4">
            <p className="text-sm uppercase text-white/50">Account ID</p>
            <p className="mt-1 break-all text-sm text-white/80">{user.id}</p>
          </div>
          <Button variant="outline" onClick={onSignOut}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}

function SetupScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-3xl">Backend setup needed</CardTitle>
          <CardDescription className="text-base">
            Add the Supabase project URL and publishable key before accounts can connect across devices.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-white/70">
          <p>Use the values in `.env.example`, then run the SQL in `supabase/schema.sql` inside Supabase.</p>
          <p>On Vercel, add the same variables to the project settings for Starpower.technology.</p>
        </CardContent>
      </Card>
    </main>
  )
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
      <Card className="p-6 text-center text-white/70">{label}</Card>
    </main>
  )
}

function LoadingOverlay({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <Card className="p-6 text-center text-white/70">{label}</Card>
    </div>
  )
}

function PlaceholderScreen({ title, detail }: { title: string; detail: string }) {
  return (
    <section className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-xl text-center">
        <CardHeader>
          <CardTitle className="text-3xl">{title}</CardTitle>
          <CardDescription className="text-base">{detail}</CardDescription>
        </CardHeader>
      </Card>
    </section>
  )
}

export default App
