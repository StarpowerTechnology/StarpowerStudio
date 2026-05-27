import { Button } from '../components/ui/button'

type LandingPageProps = {
  openLogin: () => void
}

export function LandingPage({ openLogin }: LandingPageProps) {
  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <header className="flex justify-end">
        <Button variant="outline" onClick={openLogin}>
          Login
        </Button>
      </header>
      <section className="flex min-h-[calc(100vh-96px)] flex-col items-center justify-center gap-8 text-center">
        <h1 className="text-5xl font-semibold tracking-normal md:text-7xl">Starpower Technology</h1>
        <img
          className="h-28 w-28 object-contain md:h-36 md:w-36"
          src="/brand/starpower-logo.png"
          alt="StarPower logo"
        />
      </section>
    </main>
  )
}
