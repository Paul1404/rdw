import type { DeploymentStatus } from "../shared/railway/types";

const statusClass: Record<DeploymentStatus, string> = {
  BUILDING: "status status-active",
  DEPLOYING: "status status-active",
  QUEUED: "status status-active",
  WAITING: "status status-waiting",
  SUCCESS: "status status-success",
  FAILED: "status status-problem",
  CRASHED: "status status-problem",
  REMOVED: "status status-muted",
  SLEEPING: "status status-muted",
  SKIPPED: "status status-muted",
};

export function StatusBadge({ status }: { status: DeploymentStatus }) {
  return <span className={statusClass[status]}>{status.toLowerCase()}</span>;
}
