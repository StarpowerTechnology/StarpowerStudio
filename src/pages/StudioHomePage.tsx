import { Database, Image, Music, NotebookTabs } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '../components/ui/card'

type StudioHomePageProps = {
  openDatasetEditor: () => void
  openImageDatabase: () => void
  openJupyterNotebook: () => void
  openMusicDatabase: () => void
}

export function StudioHomePage({
  openDatasetEditor,
  openImageDatabase,
  openJupyterNotebook,
  openMusicDatabase,
}: StudioHomePageProps) {
  const tools = [
    { title: 'Dataset Editor', icon: Database, action: openDatasetEditor },
    { title: 'Jupyter Notebook', icon: NotebookTabs, action: openJupyterNotebook },
    { title: 'IMG Database', icon: Image, action: openImageDatabase },
    { title: 'Music Database', icon: Music, action: openMusicDatabase },
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
