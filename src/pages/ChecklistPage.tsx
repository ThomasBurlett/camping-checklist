import { useEffect, useRef } from "react"
import { Card, Link } from "@heroui/react"
import { Cloud, FolderOpen, Layers3, UserRound } from "lucide-react"
import { ActivityNav } from "@/components/checklist/ActivityNav"
import { ChecklistSection } from "@/components/checklist/ChecklistSection"
import { ChecklistToolbar } from "@/components/checklist/ChecklistToolbar"
import { ChecklistBackLink } from "@/components/navigation/ChecklistBackLink"
import { useAuth } from "@/auth/auth-context"
import { CHECKLISTS, CHECKLIST_MAP } from "@/data/checklists"
import { ActivityIcon } from "@/lib/activity-icons"
import {
  fireCompletionConfetti,
  fireItemConfetti,
  type ConfettiOrigin,
} from "@/lib/confetti"
import { useChecklistState } from "@/hooks/useChecklistState"

interface ChecklistPageProps {
  slug: string
}

export function ChecklistPage({ slug }: ChecklistPageProps) {
  const list = CHECKLIST_MAP[slug]

  if (!list) {
    return (
      <main className="page-frame">
        <section className="page-shell page-main">
          <Card className="page-hero checklist-hero" variant="tertiary">
            <Card.Content className="unknown-card-body">
              <p className="unknown-card-copy">Unknown checklist.</p>
              <ChecklistBackLink />
            </Card.Content>
          </Card>
        </section>
      </main>
    )
  }

  return <ChecklistPageContent checklist={list} />
}

function ChecklistPageContent({ checklist }: { checklist: (typeof CHECKLISTS)[number] }) {
  const {
    sections,
    totals,
    filter,
    drafts,
    openForms,
    checkedIds,
    syncStatus,
    hasVisibleOpenSection,
    actions,
  } = useChecklistState(checklist)
  const previousCheckedIdsRef = useRef<Set<string>>(new Set(checkedIds))
  const hasLoadedSyncedStateRef = useRef(false)
  const wasCompleteRef = useRef(totals.total > 0 && totals.checked === totals.total)
  const pendingItemConfettiRef = useRef<{ itemId: string; origin?: ConfettiOrigin } | null>(null)

  useEffect(() => {
    if (syncStatus === "synced" && !hasLoadedSyncedStateRef.current) {
      previousCheckedIdsRef.current = new Set(checkedIds)
      hasLoadedSyncedStateRef.current = true
      return
    }

    const previousCheckedIds = previousCheckedIdsRef.current
    const newlyCheckedIds = [...checkedIds].filter((itemId) => !previousCheckedIds.has(itemId))

    if (newlyCheckedIds.length === 1) {
      const pendingItemConfetti = pendingItemConfettiRef.current
      if (pendingItemConfetti?.itemId === newlyCheckedIds[0] && pendingItemConfetti.origin) {
        fireItemConfetti(pendingItemConfetti.origin)
      } else {
      const itemElement = document.querySelector<HTMLElement>(
        `[data-checklist-item-id="${newlyCheckedIds[0]}"]`,
      )

      if (itemElement) {
        fireItemConfetti(itemElement)
      }
      }
    }

    pendingItemConfettiRef.current = null
    previousCheckedIdsRef.current = new Set(checkedIds)
  }, [checkedIds, syncStatus])

  useEffect(() => {
    const isComplete = totals.total > 0 && totals.checked === totals.total

    if (isComplete && !wasCompleteRef.current) {
      fireCompletionConfetti()
    }

    wasCompleteRef.current = isComplete
  }, [totals.checked, totals.total])

  const handleUpdateChecked = (itemId: string, nextChecked: boolean, origin?: ConfettiOrigin) => {
    pendingItemConfettiRef.current = nextChecked ? { itemId, origin } : null
    actions.updateChecked(itemId, nextChecked)
  }

  const sectionsCount = sections.length

  if (syncStatus === "loading") {
    return (
      <main className="page-frame checklist-page">
        <header className="page-shell checklist-shell page-header checklist-page-header">
          <section className="home-hero checklist-hero" aria-labelledby="checklist-title">
            <ChecklistTopbar />
            <div className="home-hero-copy checklist-hero-copy">
              <div className="checklist-hero-title-block">
                <div className="checklist-category-badge" aria-label={`${checklist.category} category`}>
                  <FolderOpen aria-hidden="true" size={14} strokeWidth={2.2} />
                  <span>{checklist.category}</span>
                </div>
                <h1 className="page-title" id="checklist-title">
                  {checklist.label}
                </h1>
                <Card.Description className="page-subtitle">
                  Loading your saved checklist progress.
                </Card.Description>
              </div>
            </div>
          </section>
        </header>
      </main>
    )
  }

  return (
    <main className="page-frame checklist-page">
      <header className="page-shell checklist-shell page-header checklist-page-header">
        <section className="home-hero checklist-hero" aria-labelledby="checklist-title">
          <ChecklistTopbar />

          <div className="home-hero-copy checklist-hero-copy">
            <div className="checklist-hero-main">
              <div className="checklist-hero-title-block">
                <div className="checklist-category-badge" aria-label={`${checklist.category} category`}>
                  <FolderOpen aria-hidden="true" size={14} strokeWidth={2.2} />
                  <span>{checklist.category}</span>
                </div>
                <h1 className="sr-only" id="checklist-title">
                  {checklist.label}
                </h1>
                <ActivityNav
                  activeSlug={checklist.slug}
                  checklists={CHECKLISTS}
                  variant="hero-title"
                />
                <Card.Description className="page-subtitle">
                  {checklist.subtitle}
                </Card.Description>
              </div>
            </div>

            <div className="home-hero-facts checklist-hero-facts" aria-label="Checklist summary">
              <div
                className="home-hero-fact checklist-hero-fact checklist-hero-icon-fact"
                aria-label={`${checklist.label} activity`}
                title={`${checklist.label} activity`}
              >
                <ActivityIcon slug={checklist.slug} size={17} strokeWidth={2.1} />
              </div>
              <div className="home-hero-fact checklist-hero-fact">
                <Layers3 aria-hidden="true" size={15} strokeWidth={2.1} />
                <span>{sectionsCount} sections</span>
              </div>
              <div className="home-hero-fact checklist-hero-fact">
                <Cloud aria-hidden="true" size={15} strokeWidth={2.1} />
                <span>{getSyncStatusLabel(syncStatus)}</span>
              </div>
            </div>
          </div>
        </section>

        <div className="checklist-hero-controls">
          <ChecklistToolbar
            checked={totals.checked}
            filter={filter}
            hasVisibleOpenSection={hasVisibleOpenSection}
            onFilterChange={actions.setFilter}
            onResetChecks={actions.resetChecks}
            onToggleAllSections={actions.toggleAllSections}
            percent={totals.percent}
            total={totals.total}
          />
        </div>
      </header>

      <section className="page-shell checklist-shell page-main checklist-sections-shell">
        <div className="sections-wrap">
          {sections.map((section) => (
            <ChecklistSection
              checkedIds={checkedIds}
              draftKind={drafts[section.id]?.kind ?? "core"}
              editingItemId={drafts[section.id]?.editingItemId}
              draftValue={drafts[section.id]?.label ?? ""}
              isFormOpen={openForms.has(section.id)}
              key={section.id}
              onDeleteCustomItem={actions.deleteCustomItem}
              onDraftChange={actions.setDraft}
              onDraftKindChange={actions.setDraftKind}
              onEditCustomItem={actions.editCustomItem}
              onSaveCustomItem={actions.saveCustomItem}
              onSetAddFormOpen={actions.setAddFormOpen}
              onSetSectionChecked={actions.setSectionChecked}
              onSetSectionCollapsed={actions.setSectionCollapsed}
              onUpdateChecked={handleUpdateChecked}
              section={section}
            />
          ))}
        </div>
      </section>
    </main>
  )
}

function ChecklistTopbar() {
  const { isAnonymous } = useAuth()
  const accountLabel = isAnonymous ? "Sign in to save" : "Account"

  return (
    <nav className="checklist-hero-topbar" aria-label="Checklist navigation">
      <ChecklistBackLink className="checklist-hub-link" />
      <Link
        className="checklist-account-link"
        href="#/account"
        aria-label={isAnonymous ? "Sign in to save progress" : "Account and sync settings"}
      >
        <UserRound aria-hidden="true" size={16} strokeWidth={2.1} />
        <span>{accountLabel}</span>
      </Link>
    </nav>
  )
}

function getSyncStatusLabel(syncStatus: ReturnType<typeof useChecklistState>["syncStatus"]) {
  switch (syncStatus) {
    case "loading":
      return "Loading sync"
    case "saving":
      return "Saving"
    case "synced":
      return "Synced"
    case "error":
      return "Sync paused"
    default:
      return "Syncing"
  }
}
