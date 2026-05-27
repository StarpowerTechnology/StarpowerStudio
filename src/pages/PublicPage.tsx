import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import type { PublicDataset } from '../lib/studio-data'

type PublicPageProps = {
  datasets: PublicDataset[]
}

export function PublicPage({ datasets }: PublicPageProps) {
  return (
    <section className="p-6 md:p-10">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold">Public</h2>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {datasets.map((dataset) => (
          <Card key={dataset.id} className="min-h-52">
            <CardHeader>
              <CardTitle className="text-3xl">{dataset.name}</CardTitle>
              <CardDescription className="text-base">{dataset.creator}</CardDescription>
              {dataset.description && <p className="pt-4 text-sm leading-6 text-white/65">{dataset.description}</p>}
            </CardHeader>
          </Card>
        ))}
        {datasets.length === 0 && (
          <Card className="border-dashed p-8 text-center text-white/60">No public datasets yet.</Card>
        )}
      </div>
    </section>
  )
}
