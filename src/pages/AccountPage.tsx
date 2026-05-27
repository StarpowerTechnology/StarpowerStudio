import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Image, LogIn, Mail, UserPlus } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import {
  getProfilePhoto,
  getProfileUsername,
  normalizeUsername,
  type Profile,
} from '../lib/account-data'

type AccountPageProps = {
  authError: string
  profile: Profile | null
  profileError: string
  saveStatus: string
  user: User | null
  onCheckUsername: (username: string) => Promise<boolean>
  onEmailLogin: (identifier: string, password: string) => Promise<void>
  onEmailSignup: (username: string, email: string, password: string) => Promise<void>
  onGoogleLogin: () => Promise<void>
  onSaveUsername: (username: string) => Promise<void>
  onSignOut: () => Promise<void>
}

type AccountMode = 'closed' | 'login' | 'signup'

export function AccountPage({
  authError,
  profile,
  profileError,
  saveStatus,
  user,
  onCheckUsername,
  onEmailLogin,
  onEmailSignup,
  onGoogleLogin,
  onSaveUsername,
  onSignOut,
}: AccountPageProps) {
  const [mode, setMode] = useState<AccountMode>('closed')
  const [identifier, setIdentifier] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [signupUsername, setSignupUsername] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [usernameStatus, setUsernameStatus] = useState('')
  const [usernamePrompt, setUsernamePrompt] = useState('')
  const [loadingAction, setLoadingAction] = useState<'login' | 'signup' | 'google' | 'username' | null>(null)

  const username = getProfileUsername(user, profile)
  const photoUrl = getProfilePhoto(user, profile)
  const needsUsername = Boolean(user) && !profile?.username

  useEffect(() => {
    if (mode !== 'signup') return

    const normalizedUsername = normalizeUsername(signupUsername)
    if (normalizedUsername.length < 3) return

    let canceled = false
    const timeout = window.setTimeout(() => {
      onCheckUsername(normalizedUsername)
        .then((available) => {
          if (canceled) return
          setUsernameAvailable(available)
          setUsernameStatus(available ? 'Username is available.' : 'Username is taken.')
        })
        .catch((error) => {
          if (canceled) return
          setUsernameAvailable(false)
          setUsernameStatus(error instanceof Error ? error.message : 'Could not check username.')
        })
    }, 350)

    return () => {
      canceled = true
      window.clearTimeout(timeout)
    }
  }, [mode, onCheckUsername, signupUsername])

  function updateSignupUsername(value: string) {
    const normalizedUsername = normalizeUsername(value)
    setSignupUsername(normalizedUsername)
    setUsernameAvailable(null)

    if (!normalizedUsername) {
      setUsernameStatus('')
      return
    }

    if (normalizedUsername.length < 3) {
      setUsernameStatus('Username must be at least 3 characters.')
      return
    }

    setUsernameStatus('Checking username...')
  }

  async function submitLogin() {
    setLoadingAction('login')
    try {
      await onEmailLogin(identifier, loginPassword)
    } finally {
      setLoadingAction(null)
    }
  }

  async function submitSignup() {
    setLoadingAction('signup')
    try {
      await onEmailSignup(signupUsername, signupEmail, signupPassword)
    } finally {
      setLoadingAction(null)
    }
  }

  async function submitGoogleLogin() {
    setLoadingAction('google')
    try {
      await onGoogleLogin()
    } finally {
      setLoadingAction(null)
    }
  }

  async function submitUsername() {
    setLoadingAction('username')
    try {
      await onSaveUsername(usernamePrompt)
      setUsernamePrompt('')
    } finally {
      setLoadingAction(null)
    }
  }

  if (user) {
    return (
      <section className="flex min-h-screen flex-col p-6 md:p-10">
        <div className="mb-8">
          <h2 className="text-3xl font-semibold">Account</h2>
        </div>

        <div className="flex flex-1 flex-col">
          <div className="grid max-w-2xl gap-6">
            <div className="flex items-center gap-5">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-white/25 bg-white/5">
                {photoUrl ? (
                  <img className="h-full w-full object-cover" src={photoUrl} alt="" />
                ) : (
                  <Image className="h-9 w-9 text-white/60" />
                )}
              </div>
              <div>
                <h2 className="text-3xl font-semibold">{username}</h2>
                <p className="mt-2 text-sm text-white/60">Cloud sync is {saveStatus.toLowerCase()}.</p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Bio</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="min-h-20 text-base text-white/75">{profile?.bio || 'No bio yet.'}</p>
              </CardContent>
            </Card>

            {profileError && <Card className="border-white/40 p-3 text-sm text-white/70">{profileError}</Card>}
          </div>

          <div className="mt-auto pt-10">
            <Button className="h-12 min-w-40 text-base" variant="outline" onClick={onSignOut}>
              Log out
            </Button>
          </div>
        </div>

        {needsUsername && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-2xl">Choose a username</CardTitle>
                <CardDescription>Pick the username people will see in StarPower Studio.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <Input
                  aria-label="username"
                  autoFocus
                  placeholder="username"
                  value={usernamePrompt}
                  onChange={(event) => setUsernamePrompt(normalizeUsername(event.target.value))}
                />
                {profileError && <p className="text-sm text-white/60">{profileError}</p>}
                <Button onClick={submitUsername} disabled={loadingAction !== null || usernamePrompt.length < 3}>
                  {loadingAction === 'username' ? 'Saving...' : 'Save username'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </section>
    )
  }

  return (
    <section className="p-6 md:p-10">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold">Account</h2>
      </div>

      <div className="grid max-w-3xl gap-5">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <LogIn className="h-6 w-6" />
              Email/username login
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Button className="h-12 text-base" variant="outline" onClick={() => setMode(mode === 'login' ? 'closed' : 'login')}>
              Login
            </Button>
            {mode === 'login' && (
              <div className="grid gap-4">
                <Input
                  aria-label="email or username"
                  autoComplete="username"
                  placeholder="email/username"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                />
                <Input
                  aria-label="password"
                  autoComplete="current-password"
                  placeholder="password"
                  type="password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') submitLogin()
                  }}
                />
                <Button onClick={submitLogin} disabled={loadingAction !== null || !identifier.trim() || !loginPassword}>
                  {loadingAction === 'login' ? 'Logging in...' : 'Login'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <UserPlus className="h-6 w-6" />
              Signup
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Button className="h-12 text-base" variant="outline" onClick={() => setMode(mode === 'signup' ? 'closed' : 'signup')}>
              Signup
            </Button>
            {mode === 'signup' && (
              <div className="grid gap-4">
                <Input
                  aria-label="signup username"
                  autoComplete="username"
                  placeholder="username"
                  value={signupUsername}
                  onChange={(event) => updateSignupUsername(event.target.value)}
                />
                {usernameStatus && (
                  <p className={usernameAvailable ? 'text-sm text-white/70' : 'text-sm text-white/45'}>{usernameStatus}</p>
                )}
                <Input
                  aria-label="signup email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="email"
                  value={signupEmail}
                  onChange={(event) => setSignupEmail(event.target.value)}
                />
                <Input
                  aria-label="signup password"
                  autoComplete="new-password"
                  placeholder="password"
                  type="password"
                  value={signupPassword}
                  onChange={(event) => setSignupPassword(event.target.value)}
                />
                <Button
                  onClick={submitSignup}
                  disabled={loadingAction !== null || !usernameAvailable || !signupEmail.trim() || !signupPassword}
                >
                  {loadingAction === 'signup' ? 'Creating account...' : 'Create account'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Mail className="h-6 w-6" />
              Gmail login
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="h-12 w-full text-base" variant="outline" onClick={submitGoogleLogin} disabled={loadingAction !== null}>
              {loadingAction === 'google' ? 'Opening Gmail...' : 'Continue with Gmail'}
            </Button>
          </CardContent>
        </Card>

        {(authError || profileError) && (
          <Card className="border-white/40 p-3 text-sm text-white/70">{authError || profileError}</Card>
        )}
      </div>
    </section>
  )
}
