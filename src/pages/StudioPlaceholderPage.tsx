import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/card'

type StudioPlaceholderPageProps = {
  title: string
  detail: string
}

export function StudioPlaceholderPage({ title, detail }: StudioPlaceholderPageProps) {
  return (
    <section className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-xl text-center">
        <CardHeader>
          <CardTitle className="text-3xl">{title}</CardTitle>
          <CardDescription className="text-base">{detail}</CardDescription>
        </CardHeader>
      </Card>
    </section>
  )
}
