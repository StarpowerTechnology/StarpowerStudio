import { useEffect, useRef } from 'react'
import { ArrowDown, ArrowUp, Download, Edit3, Plus, Send, Share2, Trash2 } from 'lucide-react'
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

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [activeConversation.id, activeConversation.messages.length])

  return (
    <section className="grid h-screen min-h-[780px] grid-rows-[auto_1fr_auto]">
      <header className="flex flex-col gap-4 border-b border-white/20 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase text-white/50">Dataset Editor</p>
          <h2 className="text-2xl font-semibold">{activeProject.name}</h2>
          <p className={cn('mt-2 text-sm', saveError ? 'text-red-300' : 'text-white/50')}>
            {saveError || saveStatus}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant={activeProject.isPublic ? 'default' : 'outline'}
            onClick={() => toggleProjectVisibility(activeProject.id, !activeProject.isPublic)}
          >
            <Share2 /> {activeProject.isPublic ? 'Public' : 'Private'}
          </Button>
          <Button onClick={exportJsonl}>
            <Download /> Export JSONL
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 grid-cols-1 lg:grid-cols-[240px_1fr_280px]">
        <ConversationPanel
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

        <StatsPanel stats={stats} statsMode={statsMode} setStatsMode={setStatsMode} />
      </div>

      <footer className="border-t border-white/20 p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <Select value={nextRole} onValueChange={(value) => setNextRole(value as Role)}>
            <SelectTrigger className="lg:w-40">
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
  conversations: Conversation[]
  activeConversationId: string
  addConversation: () => void
  renameConversation: (conversationId: string) => void
  deleteConversation: (conversationId: string) => void
  setActiveConversationId: (conversationId: string) => void
}

function ConversationPanel({
  conversations,
  activeConversationId,
  addConversation,
  renameConversation,
  deleteConversation,
  setActiveConversationId,
}: ConversationPanelProps) {
  return (
    <aside className="min-h-0 overflow-y-auto border-b border-white/20 p-4 lg:border-b-0">
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
  stats: DatasetStats
  statsMode: StatsMode
  setStatsMode: (mode: StatsMode) => void
}

function StatsPanel({ stats, statsMode, setStatsMode }: StatsPanelProps) {
  const usage = statsMode === 'letters' ? stats.letters : stats.words

  return (
    <aside className="min-h-0 overflow-y-auto p-4">
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
