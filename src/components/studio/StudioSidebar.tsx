import { Database, Folder, Globe2, Home, NotebookTabs, UserCircle } from 'lucide-react'
import { cn } from '../../lib/utils'

export type StudioRoute =
  | 'studio'
  | 'dataset-editor'
  | 'jupyter-notebook'
  | 'public'
  | 'projects'
  | 'account'
  | 'image-database'
  | 'music-database'

type StudioSidebarProps = {
  activeRoute: StudioRoute
  navigate: (route: StudioRoute) => void
}

export function StudioSidebar({ activeRoute, navigate }: StudioSidebarProps) {
  const navItems = [
    { route: 'studio' as StudioRoute, label: 'Home', icon: Home },
    { route: 'dataset-editor' as StudioRoute, label: 'Dataset Editor', icon: Database },
    { route: 'jupyter-notebook' as StudioRoute, label: 'Jupyter Notebook', icon: NotebookTabs },
    { route: 'public' as StudioRoute, label: 'Public', icon: Globe2 },
    { route: 'projects' as StudioRoute, label: 'Projects', icon: Folder },
  ]

  return (
    <aside className="flex min-h-28 flex-col border-b border-white/20 p-5 md:min-h-screen md:border-b-0">
      <button
        className="mb-8 flex items-center gap-3 rounded-md text-left transition hover:bg-white/5"
        onClick={() => navigate('studio')}
        type="button"
      >
        <img className="h-10 w-10 object-contain" src="/brand/starpower-logo.png" alt="" />
        <div className="text-sm font-semibold uppercase leading-tight tracking-normal">
          StarPower
          <br />
          Studio
        </div>
      </button>
      <nav className="grid gap-2">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.route}
              className={cn(
                'flex items-center gap-3 rounded-md border border-transparent px-3 py-3 text-left text-lg transition hover:border-white/30 hover:bg-white/5',
                activeRoute === item.route && 'border-white/40 bg-white/10',
              )}
              onClick={() => navigate(item.route)}
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
          activeRoute === 'account' && 'border-white/40 bg-white/10',
        )}
        onClick={() => navigate('account')}
        type="button"
      >
        <UserCircle className="h-8 w-8" />
        Account
      </button>
    </aside>
  )
}
