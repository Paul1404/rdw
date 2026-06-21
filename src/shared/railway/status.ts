import type { DeploymentStatus, ProjectDeploymentGroup } from "./types";

export const problemStatuses = new Set<DeploymentStatus>(["FAILED", "CRASHED"]);
export const activeStatuses = new Set<DeploymentStatus>([
  "BUILDING",
  "DEPLOYING",
  "QUEUED",
  "WAITING",
]);

export function isProblemStatus(status: DeploymentStatus) {
  return problemStatuses.has(status);
}

export function isActiveStatus(status: DeploymentStatus) {
  return activeStatuses.has(status);
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
  const timestamp = deployment.updatedAt ?? deployment.createdAt;
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
