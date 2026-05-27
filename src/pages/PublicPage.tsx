import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/card'

type PublicPageProps = {
  datasets: Array<{ name: string; creator: string }>
}

export function PublicPage({ datasets }: PublicPageProps) {
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
