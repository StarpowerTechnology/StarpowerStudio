import { Button } from '../components/ui/button'

type LandingPageProps = {
  openAccount: () => void
  openStudio: () => void
}

export function LandingPage({ openAccount, openStudio }: LandingPageProps) {
  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <header className="flex items-center justify-between">
        <nav className="flex items-center gap-3" aria-label="Social links">
          <Button asChild variant="outline" size="icon" className="group">
            <a
              href="https://github.com/starpowertechnology"
              target="_blank"
              rel="noreferrer"
              aria-label="Starpower Technology on GitHub"
            >
              <img
                className="h-5 w-5 object-contain transition group-hover:invert"
                src="/brand/github-white-icon.webp"
                alt=""
              />
            </a>
          </Button>
          <Button asChild variant="outline" size="icon" className="group">
            <a
              href="https://x.com/starpower_tech"
              target="_blank"
              rel="noreferrer"
              aria-label="Starpower Technology on X"
            >
              <img
                className="h-5 w-5 object-contain transition group-hover:invert"
                src="/brand/x-logo.avif"
                alt=""
              />
            </a>
          </Button>
        </nav>
        <Button variant="outline" onClick={openAccount}>
          Account
        </Button>
      </header>
      <section className="flex min-h-[calc(100vh-96px)] flex-col items-center justify-center gap-8 text-center">
        <h1 className="text-5xl font-semibold tracking-normal md:text-7xl">Starpower Technology</h1>
        <button className="rounded-md p-3 transition hover:bg-white/5" onClick={openStudio} type="button">
          <img
            className="h-28 w-28 object-contain md:h-36 md:w-36"
            src="/brand/starpower-logo.png"
            alt="StarPower logo"
          />
        </button>
      </section>
    </main>
  )
}
