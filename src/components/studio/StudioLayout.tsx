import type { ReactNode } from 'react'
import { StudioSidebar, type StudioRoute } from './StudioSidebar'
import { cn } from '../../lib/utils'

type StudioLayoutProps = {
  activeRoute: StudioRoute
  children: ReactNode
  navigate: (route: StudioRoute) => void
}

export function StudioLayout({ activeRoute, children, navigate }: StudioLayoutProps) {
  const isDatasetEditor = activeRoute === 'dataset-editor'

  return (
    <div className="min-h-screen bg-black text-white">
      <div className={cn('grid min-h-screen grid-cols-1', !isDatasetEditor && 'md:grid-cols-[250px_1fr]')}>
        {!isDatasetEditor && (
          <StudioSidebar activeRoute={activeRoute} navigate={navigate} />
        )}
        <main className={cn('min-w-0 border-white/20', !isDatasetEditor && 'md:border-l')}>{children}</main>
      </div>
    </div>
  )
}
