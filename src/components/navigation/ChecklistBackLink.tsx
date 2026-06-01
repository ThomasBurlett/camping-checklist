import { Link } from "@heroui/react"
import { ArrowLeft } from "lucide-react"

type ChecklistBackLinkProps = {
  className?: string
  label?: string
}

export function ChecklistBackLink({
  className,
  label = "Back to checklists",
}: ChecklistBackLinkProps) {
  return (
    <Link className={["page-back-link", className].filter(Boolean).join(" ")} href="#/">
      <ArrowLeft aria-hidden="true" size={16} strokeWidth={2.2} />
      <span>{label}</span>
    </Link>
  )
}
