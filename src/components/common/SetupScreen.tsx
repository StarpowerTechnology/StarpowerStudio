import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'

export function SetupScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-3xl">Backend setup needed</CardTitle>
          <CardDescription className="text-base">
            Add the Supabase project URL and publishable key before accounts can connect across devices.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-white/70">
          <p>Use the values in `.env.example`, then run the SQL in `supabase/schema.sql` inside Supabase.</p>
          <p>On Vercel, add the same variables to the project settings for Starpower.technology.</p>
        </CardContent>
      </Card>
    </main>
  )
}
