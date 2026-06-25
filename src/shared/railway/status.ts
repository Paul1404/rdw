import type { DeploymentStatus, ProjectDeploymentGroup } from "./types";

export const problemStatuses = new Set<DeploymentStatus>(["FAILED", "CRASHED"]);
export const activeStatuses = new Set<DeploymentStatus>([
  "BUILDING",
  "DEPLOYING",
  "QUEUED",
  "WAITING",
]);

// Statuses Railway sets automatically without a new push or deploy. Their
// updatedAt timestamp must not count as activity, otherwise a service going
// idle would bump its project to the top of the dashboard.
export const passiveStatuses = new Set<DeploymentStatus>(["SLEEPING", "REMOVED"]);

export function isProblemStatus(status: DeploymentStatus) {
  return problemStatuses.has(status);
}

export function isActiveStatus(status: DeploymentStatus) {
  return activeStatuses.has(status);
}

export function isPassiveStatus(status: DeploymentStatus) {
  return passiveStatuses.has(status);
}

export function statusRank(status: DeploymentStatus) {
  // Deployed (SUCCESS) always leads. Everything else trails behind it.
  if (status === "SUCCESS") {
    return 0;
  }

  if (isProblemStatus(status)) {
    return 1;
  }

  if (isActiveStatus(status)) {
    return 2;
  }

  return 3;
}

export function deploymentActivityTime(deployment: ProjectDeploymentGroup["deployments"][number]) {
  // Sleeping or removed deployments fall back to createdAt so an automatic
  // idle transition never registers as fresh activity.
  const timestamp = isPassiveStatus(deployment.status)
    ? deployment.createdAt
    : (deployment.updatedAt ?? deployment.createdAt);
  const time = new Date(timestamp).getTime();

  return Number.isFinite(time) ? time : 0;
}

export function projectActivityTime(project: ProjectDeploymentGroup) {
  return Math.max(...project.deployments.map(deploymentActivityTime), 0);
}

export function projectStatusRank(project: ProjectDeploymentGroup) {
  return Math.min(...project.deployments.map((deployment) => statusRank(deployment.status)), 4);
}

export function sortProjectGroups(projects: ProjectDeploymentGroup[]) {
  return [...projects].sort((a, b) => {
    // Deployed projects lead, then problems, active, and idle. This keeps the
    // most recently deployed work in front regardless of background churn.
    const aRank = projectStatusRank(a);
    const bRank = projectStatusRank(b);

    if (aRank !== bRank) {
      return aRank - bRank;
    }

    const aActivity = projectActivityTime(a);
    const bActivity = projectActivityTime(b);

    if (aActivity !== bActivity) {
      return bActivity - aActivity;
    }

    return a.name.localeCompare(b.name);
  });
}
