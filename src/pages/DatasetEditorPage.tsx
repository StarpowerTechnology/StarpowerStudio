import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Download, Edit3, Menu, Plus, Send, Share2, Trash2, X } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Textarea } from '../components/ui/textarea'
import type { Conversation, DatasetMessage, Project, Role, StatsMode } from '../lib/studio-data'
import { cn } from '../lib/utils'

type DatasetStats = {
  totalCharacters: number
  totalWords: number
  words: [string, number][]
  letters: [string, number][]
}

type DatasetEditorPageProps = {
  activeProject: Project
  activeConversation: Conversation
  nextRole: Role
  setNextRole: (role: Role) => void
  draft: string
  setDraft: (draft: string) => void
  stats: DatasetStats
  statsMode: StatsMode
  setStatsMode: (mode: StatsMode) => void
  saveStatus: string
  saveError: string
  addConversation: () => void
  renameConversation: (conversationId: string) => void
  deleteConversation: (conversationId: string) => void
  setActiveConversationId: (conversationId: string) => void
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
  stats,
  statsMode,
  setStatsMode,
  saveStatus,
  saveError,
  addConversation,
  renameConversation,
  deleteConversation,
  setActiveConversationId,
  toggleProjectVisibility,
  addMessage,
  insertMessageAfter,
  updateMessage,
  deleteMessage,
  moveMessage,
  exportJsonl,
}: DatasetEditorPageProps) {
  const messageEndRef = useRef<HTMLDivElement>(null)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [activeConversation.id, activeConversation.messages.length])

  useEffect(() => {
    if (!mobileSidebarOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMobileSidebarOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mobileSidebarOpen])

  return (
    <section className="grid h-dvh min-h-0 grid-rows-[auto_1fr_auto] overflow-hidden">
      <header className="flex items-start justify-between gap-3 border-b border-white/20 p-4 sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            className="mt-1 lg:hidden"
            variant="ghost"
            size="icon"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="open conversations and stats"
            aria-controls="dataset-mobile-sidebar"
            aria-expanded={mobileSidebarOpen}
            aria-haspopup="dialog"
          >
            <Menu />
          </Button>
          <div className="min-w-0">
            <p className="text-sm uppercase text-white/50">Dataset Editor</p>
            <h2 className="truncate text-2xl font-semibold">{activeProject.name}</h2>
            <p className={cn('mt-2 text-sm', saveError ? 'text-red-300' : 'text-white/50')}>
              {saveError || saveStatus}
            </p>
          </div>
        </div>
        <div className="grid shrink-0 gap-2 sm:flex sm:gap-3">
          <Button
            className="px-3"
            variant={activeProject.isPublic ? 'default' : 'outline'}
            onClick={() => toggleProjectVisibility(activeProject.id, !activeProject.isPublic)}
          >
            <Share2 /> <span className="hidden sm:inline">{activeProject.isPublic ? 'Public' : 'Private'}</span>
          </Button>
          <Button className="px-3" onClick={exportJsonl}>
            <Download /> <span className="hidden sm:inline">Export JSONL</span>
          </Button>
        </div>
      </header>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            className="absolute inset-0 bg-black/70"
            type="button"
            aria-label="close conversations and stats"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside
            id="dataset-mobile-sidebar"
            className="relative z-10 grid h-full w-[min(86vw,360px)] grid-rows-[auto_minmax(0,1fr)_minmax(0,1fr)] border-r border-white/20 bg-black shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Conversations and stats"
          >
            <div className="flex items-center justify-between border-b border-white/20 p-4">
              <h2 className="font-semibold">Project Tools</h2>
              <Button variant="ghost" size="icon" onClick={() => setMobileSidebarOpen(false)} aria-label="close sidebar">
                <X />
              </Button>
            </div>
            <ConversationPanel
              className="border-b border-white/20"
              conversations={activeProject.conversations}
              activeConversationId={activeConversation.id}
              addConversation={addConversation}
              renameConversation={renameConversation}
              deleteConversation={deleteConversation}
              setActiveConversationId={(conversationId) => {
                setActiveConversationId(conversationId)
                setMobileSidebarOpen(false)
              }}
            />
            <StatsPanel stats={stats} statsMode={statsMode} setStatsMode={setStatsMode} />
          </aside>
        </div>
      )}

      <div className="grid min-h-0 grid-cols-1 lg:grid-cols-[240px_1fr_280px]">
        <ConversationPanel
          className="hidden lg:block"
          conversations={activeProject.conversations}
          activeConversationId={activeConversation.id}
          addConversation={addConversation}
          renameConversation={renameConversation}
          deleteConversation={deleteConversation}
          setActiveConversationId={setActiveConversationId}
        />

        <div className="min-h-0 overflow-y-auto border-white/20 p-5 lg:border-x">
          <div className="grid gap-5">
            {activeConversation.messages.length === 0 && (
              <Card className="border-dashed p-8 text-center text-white/60">
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
        </div>

        <StatsPanel className="hidden lg:block" stats={stats} statsMode={statsMode} setStatsMode={setStatsMode} />
      </div>

      <footer className="border-t border-white/20 p-4">
        <div className="flex gap-3">
          <Select value={nextRole} onValueChange={(value) => setNextRole(value as Role)}>
            <SelectTrigger className="w-28 shrink-0 lg:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">user</SelectItem>
              <SelectItem value="assistant">assistant</SelectItem>
              <SelectItem value="system">system</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            className="min-h-14 flex-1 resize-none"
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
          <Button className="h-14 lg:w-16" onClick={addMessage} size="icon" aria-label="send message">
            <Send />
          </Button>
        </div>
      </footer>
    </section>
  )
}

type ConversationPanelProps = {
  className?: string
  conversations: Conversation[]
  activeConversationId: string
  addConversation: () => void
  renameConversation: (conversationId: string) => void
  deleteConversation: (conversationId: string) => void
  setActiveConversationId: (conversationId: string) => void
}

function ConversationPanel({
  className,
  conversations,
  activeConversationId,
  addConversation,
  renameConversation,
  deleteConversation,
  setActiveConversationId,
}: ConversationPanelProps) {
  return (
    <aside className={cn('min-h-0 overflow-y-auto p-4', className)}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="font-semibold">Conversations</h3>
        <Button variant="outline" size="icon" onClick={addConversation} aria-label="new conversation">
          <Plus />
        </Button>
      </div>
      <div className="grid gap-2">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={cn(
              'rounded-md border border-white/20 p-3',
              conversation.id === activeConversationId && 'border-white bg-white/10',
            )}
          >
            <button
              className="mb-3 w-full text-left text-sm font-medium"
              type="button"
              onClick={() => setActiveConversationId(conversation.id)}
            >
              {conversation.title}
            </button>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => renameConversation(conversation.id)} aria-label="rename">
                <Edit3 />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteConversation(conversation.id)}
                aria-label="delete conversation"
                disabled={conversations.length === 1}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </aside>
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
  return (
    <Card className={cn('max-w-3xl', message.role === 'assistant' && 'ml-auto border-white/60')}>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 pb-3">
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
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => insertMessageAfter(message.id)} aria-label="insert message">
            <Plus />
          </Button>
          <Button variant="ghost" size="icon" aria-label="edit message">
            <Edit3 />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => moveMessage(message.id, -1)} disabled={isFirst} aria-label="move up">
            <ArrowUp />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => moveMessage(message.id, 1)} disabled={isLast} aria-label="move down">
            <ArrowDown />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => deleteMessage(message.id)} aria-label="delete message">
            <Trash2 />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          className="resize-y border-white/20"
          value={message.content}
          placeholder="write message"
          onChange={(event) => updateMessage(message.id, { content: event.target.value })}
        />
      </CardContent>
    </Card>
  )
}

type StatsPanelProps = {
  className?: string
  stats: DatasetStats
  statsMode: StatsMode
  setStatsMode: (mode: StatsMode) => void
}

function StatsPanel({ className, stats, statsMode, setStatsMode }: StatsPanelProps) {
  const usage = statsMode === 'letters' ? stats.letters : stats.words

  return (
    <aside className={cn('min-h-0 overflow-y-auto p-4', className)}>
      <h3 className="mb-4 font-semibold">Stats</h3>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Card className="p-3">
          <p className="text-xs uppercase text-white/50">Characters</p>
          <p className="text-2xl font-semibold">{stats.totalCharacters}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs uppercase text-white/50">Words</p>
          <p className="text-2xl font-semibold">{stats.totalWords}</p>
        </Card>
      </div>
      <Select value={statsMode} onValueChange={(value) => setStatsMode(value as StatsMode)}>
        <SelectTrigger className="mb-4">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="words">words</SelectItem>
          <SelectItem value="letters">letters</SelectItem>
          <SelectItem value="bpe">BPE</SelectItem>
        </SelectContent>
      </Select>
      {statsMode === 'bpe' ? (
        <Card className="p-4 text-sm text-white/60">BPE/token-style counting placeholder.</Card>
      ) : (
        <Card className="p-3">
          <div className="mb-3 text-sm font-medium">{statsMode === 'letters' ? 'Letter usage' : 'Word usage'}</div>
          <div className="grid max-h-80 gap-2 overflow-y-auto pr-1 text-sm">
            {usage.length === 0 && <p className="text-white/50">No usage yet.</p>}
            {usage.slice(0, 60).map(([item, count]) => (
              <div key={item} className="flex items-center justify-between border-b border-white/10 pb-1">
                <span className="truncate">{item}</span>
                <span className="text-white/60">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </aside>
  )
}
