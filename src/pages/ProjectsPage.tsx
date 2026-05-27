import { ArrowUpRight, Plus } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import type { Project } from '../lib/studio-data'

type ProjectsPageProps = {
  projects: Project[]
  openProject: (projectId: string) => void
  createProject: () => void
}

export function ProjectsPage({ projects, openProject, createProject }: ProjectsPageProps) {
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
