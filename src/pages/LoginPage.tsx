import { useState } from 'react'
import { LogIn, UserCircle } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'

type LoginPageProps = {
  authError: string
  onEmailLogin: (email: string, password: string) => Promise<void>
  onEmailSignup: (email: string, password: string) => Promise<void>
  onGoogleLogin: () => Promise<void>
  onSkipLogin: () => void
}

export function LoginPage({
  authError,
  onEmailLogin,
  onEmailSignup,
  onGoogleLogin,
  onSkipLogin,
}: LoginPageProps) {
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
          {authError && <Card className="border-white/40 p-3 text-sm text-white/70">{authError}</Card>}
          <Button className="h-12 text-base" onClick={() => submit('login')} disabled={loadingAction !== null}>
            <LogIn /> {loadingAction === 'login' ? 'Logging in...' : 'Login'}
          </Button>
          <Button
            className="h-12 text-base"
            variant="outline"
            onClick={() => submit('signup')}
            disabled={loadingAction !== null}
          >
            {loadingAction === 'signup' ? 'Creating account...' : 'Sign up'}
          </Button>
          <Button
            className="h-12 text-base"
            variant="outline"
            onClick={() => submit('google')}
            disabled={loadingAction !== null}
          >
            <UserCircle /> {loadingAction === 'google' ? 'Opening Google...' : 'Continue with Google'}
          </Button>
          <Button className="h-12 text-base" variant="outline" onClick={onSkipLogin} disabled={loadingAction !== null}>
            Skip login
          </Button>
        </div>
      </section>
    </main>
  )
}
