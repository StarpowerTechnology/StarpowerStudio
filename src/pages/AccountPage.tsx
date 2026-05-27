import type { User } from '@supabase/supabase-js'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { getCreatorName } from '../lib/studio-data'

type AccountPageProps = {
  user: User
  saveStatus: string
  onSignOut: () => Promise<void>
}

export function AccountPage({ user, saveStatus, onSignOut }: AccountPageProps) {
  return (
    <section className="p-6 md:p-10">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold">Account</h2>
      </div>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">{user.email ?? getCreatorName(user)}</CardTitle>
          <CardDescription className="text-base">Cloud sync is {saveStatus.toLowerCase()}.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="rounded-md border border-white/15 p-4">
            <p className="text-sm uppercase text-white/50">Account ID</p>
            <p className="mt-1 break-all text-sm text-white/80">{user.id}</p>
          </div>
          <Button variant="outline" onClick={onSignOut}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}
