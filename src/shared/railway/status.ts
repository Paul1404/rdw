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
  if (isProblemStatus(status)) {
    return 0;
  }

  if (isActiveStatus(status)) {
    return 1;
  }

  if (status === "SUCCESS") {
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

export function sortProjectGroups(projects: ProjectDeploymentGroup[]) {
  return [...projects].sort((a, b) => {
    const aActivity = projectActivityTime(a);
    const bActivity = projectActivityTime(b);

    if (aActivity !== bActivity) {
      return bActivity - aActivity;
    }

    const aRank = Math.min(...a.deployments.map((deployment) => statusRank(deployment.status)), 4);
    const bRank = Math.min(...b.deployments.map((deployment) => statusRank(deployment.status)), 4);

    if (aRank !== bRank) {
      return aRank - bRank;
    }

    return a.name.localeCompare(b.name);
  });
}
