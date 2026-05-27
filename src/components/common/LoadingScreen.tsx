import { Card } from '../ui/card'

type LoadingScreenProps = {
  label: string
}

export function LoadingScreen({ label }: LoadingScreenProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
      <Card className="p-6 text-center text-white/70">{label}</Card>
    </main>
  )
}

export function LoadingOverlay({ label }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <Card className="p-6 text-center text-white/70">{label}</Card>
    </div>
  )
}
