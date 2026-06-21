import { describe, expect, it } from "vitest";
import { isActiveStatus, isProblemStatus, sortProjectGroups } from "../src/shared/railway/status";
import type { DeploymentCard, ProjectDeploymentGroup } from "../src/shared/railway/types";

function deployment(status: DeploymentCard["status"], projectId: string): DeploymentCard {
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
    createdAt: new Date().toISOString(),
    railwayUrl: "https://railway.com",
  };
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

  it("sorts problem projects before active and successful projects", () => {
    const projects: ProjectDeploymentGroup[] = [
      {
        id: "success",
        name: "Success",
        workspaceId: "w",
        workspaceName: "W",
        deployments: [deployment("SUCCESS", "success")],
      },
      {
        id: "active",
        name: "Active",
        workspaceId: "w",
        workspaceName: "W",
        deployments: [deployment("DEPLOYING", "active")],
      },
      {
        id: "problem",
        name: "Problem",
        workspaceId: "w",
        workspaceName: "W",
        deployments: [deployment("FAILED", "problem")],
      },
    ];

    expect(sortProjectGroups(projects).map((project) => project.id)).toEqual([
      "problem",
      "active",
      "success",
    ]);
  });
});
