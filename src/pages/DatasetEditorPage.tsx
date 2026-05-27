import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Download, Edit3, Menu, Plus, Send, Share2, Trash2, X } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { StudioSidebar, type StudioRoute } from '../components/studio/StudioSidebar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Textarea } from '../components/ui/textarea'
import type { Conversation, DatasetMessage, Project, Role } from '../lib/studio-data'
import { cn } from '../lib/utils'

type DatasetEditorPageProps = {
  activeProject: Project
  activeConversation: Conversation
  nextRole: Role
  setNextRole: (role: Role) => void
  draft: string
  setDraft: (draft: string) => void
  saveStatus: string
  saveError: string
  navigate: (route: StudioRoute) => void
  toggleProjectVisibility: (projectId: string, isPublic: boolean) => void
  addMessage: () => void
  insertMessageAfter: (messageId: string) => void
  updateMessage: (messageId: string, patch: Partial<DatasetMessage>) => void
  deleteMessage: (messageId: string) => void
  moveMessage: (messageId: string, direction: -1 | 1) => void
  exportJsonl: () => void
}

export function DatasetEditorPage({
  activeProject,
  activeConversation,
  nextRole,
  setNextRole,
  draft,
  setDraft,
  saveStatus,
  saveError,
  navigate,
  toggleProjectVisibility,
  addMessage,
  insertMessageAfter,
  updateMessage,
  deleteMessage,
  moveMessage,
  exportJsonl,
}: DatasetEditorPageProps) {
  const messageEndRef = useRef<HTMLDivElement>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [activeConversation.id, activeConversation.messages.length])

  useEffect(() => {
    if (!sidebarOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSidebarOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sidebarOpen])

  return (
    <section className="grid h-dvh min-h-0 grid-rows-[auto_1fr_auto] overflow-hidden bg-black">
      <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 border-b border-white/20 p-3 sm:p-5">
        <Button
          className="mt-1"
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(true)}
          aria-label="open navigation"
          aria-controls="dataset-navigation-sidebar"
          aria-expanded={sidebarOpen}
          aria-haspopup="dialog"
        >
          <Menu />
        </Button>
        <div className="min-w-0">
          <div className="inline-block max-w-full rounded-md border border-white/35 px-3 py-2 sm:px-4">
            <h1 className="truncate text-xl font-semibold sm:text-2xl">{activeProject.name}</h1>
          </div>
          <p className={cn('mt-2 text-sm', saveError ? 'text-red-300' : 'text-white/50')}>
            {saveError || saveStatus}
          </p>
        </div>
        <div className="grid shrink-0 gap-2 sm:flex sm:gap-3">
          <Button
            className="px-3"
            variant={activeProject.isPublic ? 'default' : 'outline'}
            onClick={() => toggleProjectVisibility(activeProject.id, !activeProject.isPublic)}
          >
            <Share2 /> <span>{activeProject.isPublic ? 'Public' : 'Private'}</span>
          </Button>
          <Button className="px-3" onClick={exportJsonl}>
            <Download /> <span>Export JSONL</span>
          </Button>
        </div>
      </header>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40">
          <button
            className="absolute inset-0 bg-black/70"
            type="button"
            aria-label="close navigation"
            onClick={() => setSidebarOpen(false)}
          />
          <aside
            id="dataset-navigation-sidebar"
            className="relative z-10 h-full w-[min(82vw,320px)] border-r border-white/25 bg-black shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            <div className="flex justify-end p-3">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} aria-label="close sidebar">
                <X />
              </Button>
            </div>
            <StudioSidebar
              activeRoute="dataset-editor"
              className="h-[calc(100%-60px)] min-h-0 border-0 pt-0 md:min-h-0"
              navigate={navigate}
              onNavigate={() => setSidebarOpen(false)}
            />
          </aside>
        </div>
      )}

      <main className="min-h-0 overflow-y-auto px-5 py-6 sm:px-10 lg:px-16">
        <div className="mx-auto grid min-h-full w-full max-w-6xl content-start gap-8 pb-6 sm:gap-10 lg:gap-12">
          {activeConversation.messages.length === 0 && (
            <Card className="mx-auto w-full max-w-2xl border-dashed p-8 text-center text-white/60">
              Start this conversation with the input bar below.
            </Card>
          )}
          {activeConversation.messages.map((message, index) => (
            <MessageCard
              key={message.id}
              message={message}
              isFirst={index === 0}
              isLast={index === activeConversation.messages.length - 1}
              insertMessageAfter={insertMessageAfter}
              updateMessage={updateMessage}
              deleteMessage={deleteMessage}
              moveMessage={moveMessage}
            />
          ))}
          <div ref={messageEndRef} />
        </div>
      </main>

      <footer className="border-t border-white/20 p-4">
        <div className="mx-auto grid min-h-28 max-w-4xl grid-cols-[1fr_auto] grid-rows-[1fr_auto] gap-3 rounded-md border border-white/35 p-3">
          <Textarea
            className="col-span-2 min-h-20 resize-none border-0 p-0 text-base focus-visible:ring-0 sm:text-lg"
            placeholder="type here"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                addMessage()
              }
            }}
          />
          <Select value={nextRole} onValueChange={(value) => setNextRole(value as Role)}>
            <SelectTrigger className="w-28 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">user</SelectItem>
              <SelectItem value="assistant">assistant</SelectItem>
              <SelectItem value="system">system</SelectItem>
            </SelectContent>
          </Select>
          <Button className="justify-self-end border-0 bg-black text-white hover:bg-black hover:text-white" onClick={addMessage} size="icon" aria-label="send message">
            <Send />
          </Button>
        </div>
      </footer>
    </section>
  )
}

type MessageCardProps = {
  message: DatasetMessage
  isFirst: boolean
  isLast: boolean
  insertMessageAfter: (messageId: string) => void
  updateMessage: (messageId: string, patch: Partial<DatasetMessage>) => void
  deleteMessage: (messageId: string) => void
  moveMessage: (messageId: string, direction: -1 | 1) => void
}

function MessageCard({
  message,
  isFirst,
  isLast,
  insertMessageAfter,
  updateMessage,
  deleteMessage,
  moveMessage,
}: MessageCardProps) {
  const alignment = message.role === 'assistant' ? 'justify-self-end' : 'justify-self-start'

  return (
    <div className={cn('grid w-[min(82vw,520px)] gap-2', alignment)}>
      <Card className={cn('border-white/45', message.role === 'assistant' && 'border-white/60')}>
        <CardHeader className="pb-3">
          <Select value={message.role} onValueChange={(value) => updateMessage(message.id, { role: value as Role })}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">user</SelectItem>
              <SelectItem value="assistant">assistant</SelectItem>
              <SelectItem value="system">system</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <Textarea
            className="min-h-28 resize-y border-white/20 text-base"
            value={message.content}
            placeholder="write message"
            onChange={(event) => updateMessage(message.id, { content: event.target.value })}
          />
        </CardContent>
      </Card>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="icon" onClick={() => insertMessageAfter(message.id)} aria-label="insert message">
          <Plus />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => moveMessage(message.id, -1)} disabled={isFirst} aria-label="move up">
          <ArrowUp />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => moveMessage(message.id, 1)} disabled={isLast} aria-label="move down">
          <ArrowDown />
        </Button>
        <Button variant="ghost" size="icon" aria-label="edit message">
          <Edit3 />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => deleteMessage(message.id)} aria-label="delete message">
          <Trash2 />
        </Button>
      </div>
    </div>
  )
}
