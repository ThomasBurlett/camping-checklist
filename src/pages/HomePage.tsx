import { useEffect, useState } from "react"
import { Card, Chip, Link } from "@heroui/react"
import { CloudOff, ChevronDown, UserRound } from "lucide-react"
import { useAuth } from "@/auth/auth-context"
import { getUserDisplayName } from "@/auth/user-display"
import { useToast } from "@/components/toast/toast-context"
import { CHECKLISTS } from "@/data/checklists"
import { ActivityIcon } from "@/lib/activity-icons"
import { loadRemoteChecklistStates } from "@/lib/remote-checklist-storage"
import { getSupabaseErrorMessage } from "@/lib/supabase-errors"
import type { PersistedChecklistState } from "@/types/checklist"

type ResumeChecklist = {
  slug: string
  checkedCount: number
  totalCount: number
  percent: number
}

const CATEGORY_ORDER = ["Travel", "Outdoor", "Cycling", "Snow"]
const CHECKLIST_ORDER_BY_CATEGORY: Record<string, string[]> = {
  Travel: [
    "travel-preparation",
    "travel-1-day",
    "travel-3-day",
    "travel-1-week",
    "travel-2-week",
  ],
}

function sortCategoryNames(left: string, right: string) {
  const leftIndex = CATEGORY_ORDER.indexOf(left)
  const rightIndex = CATEGORY_ORDER.indexOf(right)

  if (leftIndex !== -1 || rightIndex !== -1) {
    return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) -
      (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex)
  }

  return left.localeCompare(right)
}

function sortChecklistsByCategory(
  category: string,
  left: (typeof CHECKLISTS)[number],
  right: (typeof CHECKLISTS)[number],
) {
  const categoryOrder = CHECKLIST_ORDER_BY_CATEGORY[category]

  if (categoryOrder) {
    const leftIndex = categoryOrder.indexOf(left.slug)
    const rightIndex = categoryOrder.indexOf(right.slug)

    if (leftIndex !== -1 || rightIndex !== -1) {
      return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) -
        (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex)
    }
  }

  return left.label.localeCompare(right.label)
}

function createResumeLists(states: Record<string, PersistedChecklistState | null | undefined>) {
  return CHECKLISTS.map((list) => {
    const totalBaseItems = list.sections.reduce(
      (sum, section) => sum + section.items.length,
      0,
    )
    const parsedState = states[list.slug]

    if (!parsedState || typeof parsedState !== "object") {
      return null
    }

    const checkedCount = Array.isArray(parsedState.checkedIds)
      ? parsedState.checkedIds.length
      : 0
    const customItemCount =
      parsedState.customItems && typeof parsedState.customItems === "object"
        ? Object.values(parsedState.customItems).reduce(
            (sum, items) => sum + (Array.isArray(items) ? items.length : 0),
            0,
          )
        : 0
    const totalCount = totalBaseItems + customItemCount
    const hasSavedState =
      checkedCount > 0 ||
      customItemCount > 0 ||
      (Array.isArray(parsedState.collapsedSections) &&
        parsedState.collapsedSections.length > 0)

    if (!hasSavedState || totalCount === 0) {
      return null
    }

    return {
      slug: list.slug,
      checkedCount,
      totalCount,
      percent: Math.round((checkedCount / totalCount) * 100),
    }
  })
    .filter((list): list is ResumeChecklist => list !== null)
    .sort(
      (left, right) =>
        right.percent - left.percent || right.checkedCount - left.checkedCount,
    )
}

export function HomePage() {
  const { isAnonymous, isConfigured, isLoading, syncVersion, user } = useAuth()
  const { showToast } = useToast()
  const [resumeLists, setResumeLists] = useState<ResumeChecklist[]>([])
  const [openCategories, setOpenCategories] = useState<Set<string>>(() => new Set())
  const activeResumeLists = resumeLists.filter((list) => list.percent > 0)
  const accountDisplayName = getUserDisplayName(user)

  useEffect(() => {
    let isCancelled = false

    if (!user) {
      window.queueMicrotask(() => {
        if (!isCancelled) {
          setResumeLists([])
        }
      })
      return
    }

    loadRemoteChecklistStates()
      .then((states) => {
        if (!isCancelled) {
          setResumeLists(createResumeLists(states))
        }
      })
      .catch((error: unknown) => {
        if (!isCancelled) {
          showToast({
            title: "Progress may be out of date",
            description: getSupabaseErrorMessage(error),
          })
          setResumeLists([])
        }
      })

    return () => {
      isCancelled = true
    }
  }, [showToast, syncVersion, user])

  const resumeMap = Object.fromEntries(
    activeResumeLists.map((list) => [list.slug, list]),
  )
  const orderedChecklists = [...CHECKLISTS].sort((left, right) => {
    const leftInProgress = Number((resumeMap[left.slug]?.percent ?? 0) > 0)
    const rightInProgress = Number((resumeMap[right.slug]?.percent ?? 0) > 0)

    if (leftInProgress !== rightInProgress) {
      return rightInProgress - leftInProgress
    }

    return left.label.localeCompare(right.label)
  })
  const checklistGroups = Object.entries(
    orderedChecklists.reduce<Record<string, typeof CHECKLISTS>>((groups, checklist) => {
      const category = checklist.category || "General"
      groups[category] = groups[category] ? [...groups[category], checklist] : [checklist]
      return groups
    }, {}),
  )
    .map(([category, checklists]) => [
      category,
      [...checklists].sort((left, right) => sortChecklistsByCategory(category, left, right)),
    ] as const)
    .sort(([left], [right]) => sortCategoryNames(left, right))

  const toggleCategory = (category: string) => {
    setOpenCategories((current) => {
      const next = new Set(current)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  return (
    <main className="page-frame">
      <section className="page-shell home-layout">
        <header className="home-hero" aria-labelledby="home-title">
          <div className="home-hero-copy">
            <Chip className="hero-chip" variant="soft">
              Packtical
            </Chip>
            <h1 className="hero-title home-launch-title" id="home-title">
              Pick a plan and pack it right.
            </h1>
            <p className="hero-description">
              Choose an activity below, track what is ready, and come back to
              the same prep list whenever you need it.
            </p>
          </div>
          <div className="home-hero-support">
            <HomeAccountLink
              displayName={accountDisplayName}
              isAnonymous={isAnonymous}
              isConfigured={isConfigured}
              isLoading={isLoading}
              userEmail={user?.email ?? ""}
            />
            <div className="home-hero-facts" aria-label="Checklist overview">
              <span className="home-hero-fact">
                {CHECKLISTS.length} checklists ready
              </span>
              <span className="home-hero-fact">
                {checklistGroups.length} categories
              </span>
              <span className="home-hero-fact">
                {activeResumeLists.length > 0
                  ? `${activeResumeLists.length} in progress`
                  : "Synced progress ready"}
              </span>
            </div>
          </div>
        </header>

        <section className="activity-library" id="activities" aria-labelledby="activities-title">
          <header className="section-heading library-heading">
            <div>
              <h2 className="section-title" id="activities-title">
                Choose an activity
              </h2>
            </div>
          </header>
          <div className="activity-groups">
            {checklistGroups.map(([category, checklists]) => {
              const isOpen = openCategories.has(category)
              const categoryId = `activity-category-${category.toLowerCase()}`
              const panelId = `${categoryId}-panel`
              const inProgressCount = checklists.filter((list) => resumeMap[list.slug]).length

              return (
                <section
                  className={`activity-group${isOpen ? " open" : ""}`}
                  key={category}
                  aria-labelledby={categoryId}
                >
                  <button
                    aria-controls={panelId}
                    aria-expanded={isOpen}
                    className="activity-group-heading"
                    onClick={() => toggleCategory(category)}
                    type="button"
                  >
                    <span className="activity-group-heading-copy">
                      <h3 id={categoryId}>{category}</h3>
                      <span>
                        {checklists.length} {checklists.length === 1 ? "checklist" : "checklists"}
                        {inProgressCount > 0 ? ` - ${inProgressCount} in progress` : ""}
                      </span>
                    </span>
                    <span className="activity-group-chevron" aria-hidden="true">
                      <ChevronDown size={18} strokeWidth={2.2} />
                    </span>
                  </button>
                  {isOpen ? (
                    <div className="activity-group-panel" id={panelId}>
                      <div className="activity-grid">
                        {checklists.map((list) => {
                          const progress = resumeMap[list.slug]

                          return (
                            <Link
                              className="activity-card-link"
                              href={`#/${list.slug}`}
                              key={list.slug}
                            >
                              <Card className="activity-card" variant="secondary">
                                <Card.Header className="activity-card-header">
                                  <div className="activity-card-topline">
                                    <div className="activity-card-title-row">
                                      <span
                                        className="activity-card-icon"
                                        aria-hidden="true"
                                      >
                                        <ActivityIcon slug={list.slug} size={18} strokeWidth={2.1} />
                                      </span>
                                      <Card.Title>{list.label}</Card.Title>
                                    </div>
                                    {progress ? (
                                      <span className="activity-card-status">
                                        {progress.percent}% complete
                                      </span>
                                    ) : null}
                                  </div>
                                  <Card.Description>{list.summary}</Card.Description>
                                </Card.Header>
                                <Card.Content
                                  className={`activity-card-progress${progress ? "" : " activity-card-progress-empty"}`}
                                >
                                  <div
                                    aria-hidden="true"
                                    className="activity-card-progress-bar"
                                    role="presentation"
                                  >
                                    <span style={{ width: `${progress?.percent ?? 0}%` }} />
                                  </div>
                                </Card.Content>
                                <Card.Footer className="activity-card-footer">
                                  <span>
                                    {progress ? "Resume checklist " : "Open checklist "}
                                    <span aria-hidden="true">&rarr;</span>
                                  </span>
                                </Card.Footer>
                              </Card>
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                </section>
              )
            })}
          </div>
        </section>
      </section>
    </main>
  )
}

type HomeAccountLinkProps = {
  displayName: string
  isAnonymous: boolean
  isConfigured: boolean
  isLoading: boolean
  userEmail: string
}

function HomeAccountLink({
  displayName,
  isAnonymous,
  isConfigured,
  isLoading,
  userEmail,
}: HomeAccountLinkProps) {
  if (!isConfigured) {
    return (
      <span className="home-account-link home-account-link-muted">
        <CloudOff aria-hidden="true" size={16} strokeWidth={2.1} />
        <span>Sync unavailable</span>
      </span>
    )
  }

  const label = isLoading
    ? "Checking sync"
    : displayName && !isAnonymous
      ? displayName
      : isAnonymous
        ? "Sign in to save"
      : userEmail
        ? "Account"
        : "Account"

  return (
    <Link className="home-account-link" href="#/account" title={isAnonymous ? "Sign in to save progress" : userEmail || "Account and sync settings"}>
      <UserRound aria-hidden="true" size={16} strokeWidth={2.1} />
      <span>{label}</span>
    </Link>
  )
}
