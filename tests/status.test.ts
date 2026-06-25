import { describe, expect, it } from "vitest";
import { isActiveStatus, isProblemStatus, sortProjectGroups } from "../src/shared/railway/status";
import type { DeploymentCard, ProjectDeploymentGroup } from "../src/shared/railway/types";

function deployment(
  status: DeploymentCard["status"],
  projectId: string,
  createdAt = new Date().toISOString(),
  updatedAt?: string,
): DeploymentCard {
  return {
    id: `${projectId}-${status}`,
    status,
    serviceId: "svc",
    serviceName: "web",
    environmentId: "env",
    environmentName: "production",
    projectId,
    projectName: projectId,
    workspaceId: "workspace",
    workspaceName: "Workspace",
    createdAt,
    updatedAt,
    railwayUrl: "https://railway.com",
  };
}

function project(id: string, deployments: DeploymentCard[]): ProjectDeploymentGroup {
  return { id, name: id, workspaceId: "w", workspaceName: "W", deployments };
}

describe("deployment status helpers", () => {
  it("classifies problem and active statuses", () => {
    expect(isProblemStatus("FAILED")).toBe(true);
    expect(isProblemStatus("CRASHED")).toBe(true);
    expect(isProblemStatus("SUCCESS")).toBe(false);
    expect(isActiveStatus("BUILDING")).toBe(true);
    expect(isActiveStatus("QUEUED")).toBe(true);
    expect(isActiveStatus("SUCCESS")).toBe(false);
  });

  it("puts deployed projects in front, then problems, then active", () => {
    const projects: ProjectDeploymentGroup[] = [
      {
        id: "active",
        name: "Active",
        workspaceId: "w",
        workspaceName: "W",
        deployments: [deployment("DEPLOYING", "active", "2026-01-03T00:00:00.000Z")],
      },
      {
        id: "problem",
        name: "Problem",
        workspaceId: "w",
        workspaceName: "W",
        deployments: [deployment("FAILED", "problem", "2026-01-02T00:00:00.000Z")],
      },
      {
        id: "success",
        name: "Success",
        workspaceId: "w",
        workspaceName: "W",
        deployments: [deployment("SUCCESS", "success", "2026-01-01T00:00:00.000Z")],
      },
    ];

    // The deployed project leads even though it has the oldest activity.
    expect(sortProjectGroups(projects).map((group) => group.id)).toEqual([
      "success",
      "problem",
      "active",
    ]);
  });

  it("orders deployed projects by most recent deploy first", () => {
    const projects: ProjectDeploymentGroup[] = [
      project("older", [
        deployment("SUCCESS", "older", "2026-01-01T00:00:00.000Z", "2026-01-01T00:05:00.000Z"),
      ]),
      project("newer", [
        deployment("SUCCESS", "newer", "2026-01-02T00:00:00.000Z", "2026-01-02T00:05:00.000Z"),
      ]),
    ];

    expect(sortProjectGroups(projects).map((group) => group.id)).toEqual(["newer", "older"]);
  });

  it("does not let a freshly slept deployment bump its project to the top", () => {
    const projects: ProjectDeploymentGroup[] = [
      project("recent", [
        deployment("SUCCESS", "recent", "2026-01-02T00:00:00.000Z", "2026-01-02T00:05:00.000Z"),
      ]),
      // Deployed earlier, but Railway just touched updatedAt by putting it to sleep.
      project("slept", [
        deployment("SLEEPING", "slept", "2026-01-01T00:00:00.000Z", "2026-01-03T00:00:00.000Z"),
      ]),
    ];

    expect(sortProjectGroups(projects).map((group) => group.id)).toEqual(["recent", "slept"]);
  });
});
