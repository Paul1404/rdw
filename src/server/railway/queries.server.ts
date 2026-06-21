import { eq } from "drizzle-orm";
import { activeStatuses, problemStatuses, sortProjectGroups } from "../../shared/railway/status";
import type {
  DashboardResponse,
  DeploymentCard,
  DeploymentDetail,
  DeploymentLogKind,
  DeploymentLogLine,
  DeploymentStatus,
  ProjectDeploymentGroup,
  WorkspaceSummary,
} from "../../shared/railway/types";
import { db } from "../db/client.server";
import { workspaceCache } from "../db/schema";
import { railwayGraphql } from "./client.server";
import { getValidRailwayAccessToken } from "./tokens.server";

type Edge<T> = { node: T };
type Connection<T> = { edges?: Edge<T>[] };

type RailwayWorkspace = {
  id: string;
  name: string;
};

type RailwayProject = {
  id: string;
  name: string;
  services?: Connection<RailwayService>;
  environments?: Connection<RailwayEnvironment>;
};

type RailwayService = {
  id: string;
  name: string;
};

type RailwayEnvironment = {
  id: string;
  name: string;
};

type RailwayDeployment = {
  id: string;
  status: DeploymentStatus;
  createdAt: string;
  updatedAt?: string;
  canRollback?: boolean;
  meta?: {
    branch?: string;
    commitSha?: string;
    commitMessage?: string;
    [key: string]: unknown;
  };
  url?: string;
};

function nodes<T>(connection?: Connection<T>) {
  return connection?.edges?.map((edge) => edge.node) ?? [];
}

function railwayDeploymentUrl(projectId: string, serviceId: string, deploymentId: string) {
  return `https://railway.com/project/${projectId}/service/${serviceId}?deploymentId=${deploymentId}`;
}

async function mapLimit<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>) {
  const results: R[] = [];
  const executing = new Set<Promise<void>>();

  for (const item of items) {
    const promise = mapper(item).then((result) => {
      results.push(result);
    });
    executing.add(promise);
    promise.finally(() => executing.delete(promise));

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

export async function listAuthorizedWorkspaces(userId: string): Promise<WorkspaceSummary[]> {
  const accessToken = await getValidRailwayAccessToken(userId);

  const data = await railwayGraphql<{
    me?: { workspaces?: RailwayWorkspace[] };
  }>(
    accessToken,
    `query AuthorizedWorkspaces {
      me {
        workspaces {
          id
          name
        }
      }
    }`,
  );

  const workspaces = data.me?.workspaces ?? [];

  const now = new Date();
  await Promise.all(
    workspaces.map((workspace) =>
      db
        .insert(workspaceCache)
        .values({
          id: crypto.randomUUID(),
          userId,
          railwayWorkspaceId: workspace.id,
          name: workspace.name,
          lastSeenAt: now,
        })
        .onConflictDoUpdate({
          target: [workspaceCache.userId, workspaceCache.railwayWorkspaceId],
          set: {
            name: workspace.name,
            lastSeenAt: now,
          },
        }),
    ),
  );

  return workspaces;
}

export async function listProjectsForWorkspace(userId: string, workspaceId: string) {
  const accessToken = await getValidRailwayAccessToken(userId);

  const data = await railwayGraphql<{
    projects?: Connection<RailwayProject>;
  }>(
    accessToken,
    `query ProjectsForWorkspace($workspaceId: String!) {
      projects(workspaceId: $workspaceId) {
        edges {
          node {
            id
            name
          }
        }
      }
    }`,
    { workspaceId },
  );

  return nodes(data.projects);
}

export async function getProjectOverview(userId: string, projectId: string) {
  const accessToken = await getValidRailwayAccessToken(userId);

  const data = await railwayGraphql<{ project: RailwayProject }>(
    accessToken,
    `query ProjectOverview($projectId: String!) {
      project(id: $projectId) {
        id
        name
        services {
          edges {
            node {
              id
              name
            }
          }
        }
        environments {
          edges {
            node {
              id
              name
            }
          }
        }
      }
    }`,
    { projectId },
  );

  return data.project;
}

export async function listDeployments(
  userId: string,
  projectId: string,
  serviceId: string,
  environmentId: string,
): Promise<RailwayDeployment[]> {
  const accessToken = await getValidRailwayAccessToken(userId);

  const data = await railwayGraphql<{ deployments?: Connection<RailwayDeployment> }>(
    accessToken,
    `query Deployments($projectId: String!, $serviceId: String!, $environmentId: String!) {
      deployments(first: 1, input: { projectId: $projectId, serviceId: $serviceId, environmentId: $environmentId }) {
        edges {
          node {
            id
            status
            createdAt
            updatedAt
            canRollback
            url
            meta
          }
        }
      }
    }`,
    { projectId, serviceId, environmentId },
  );

  return nodes(data.deployments);
}

export async function getDeployment(
  userId: string,
  deploymentId: string,
): Promise<DeploymentDetail> {
  const accessToken = await getValidRailwayAccessToken(userId);

  const data = await railwayGraphql<{
    deployment: RailwayDeployment & {
      service?: RailwayService;
      environment?: RailwayEnvironment;
      project?: RailwayProject & { workspace?: RailwayWorkspace };
    };
  }>(
    accessToken,
    `query Deployment($deploymentId: String!) {
      deployment(id: $deploymentId) {
        id
        status
        createdAt
        updatedAt
        canRollback
        url
        meta
        service { id name }
        environment { id name }
        project { id name workspace { id name } }
      }
    }`,
    { deploymentId },
  );

  const deployment = data.deployment;
  const project = deployment.project ?? { id: "", name: "Unknown project" };
  const service = deployment.service ?? { id: "", name: "Unknown service" };
  const environment = deployment.environment ?? { id: "", name: "Unknown environment" };
  const workspace = project.workspace ?? { id: "", name: "Unknown workspace" };

  return {
    id: deployment.id,
    status: deployment.status,
    serviceId: service.id,
    serviceName: service.name,
    environmentId: environment.id,
    environmentName: environment.name,
    projectId: project.id,
    projectName: project.name,
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    branch: deployment.meta?.branch,
    commitSha: deployment.meta?.commitSha,
    commitMessage: deployment.meta?.commitMessage,
    createdAt: deployment.createdAt,
    updatedAt: deployment.updatedAt,
    railwayUrl: railwayDeploymentUrl(project.id, service.id, deployment.id),
    canRollback: deployment.canRollback,
    url: deployment.url,
    meta: deployment.meta,
  };
}

export async function getDeploymentLogs(
  userId: string,
  deploymentId: string,
  kind: DeploymentLogKind,
): Promise<DeploymentLogLine[]> {
  const accessToken = await getValidRailwayAccessToken(userId);
  const queryName =
    kind === "build" ? "buildLogs" : kind === "runtime" ? "deploymentLogs" : "httpLogs";

  const data = await railwayGraphql<
    Record<string, DeploymentLogLine[] | { logs: DeploymentLogLine[] }>
  >(
    accessToken,
    `query DeploymentLogs($deploymentId: String!) {
      ${queryName}(deploymentId: $deploymentId) {
        timestamp
        message
        level
      }
    }`,
    { deploymentId },
  );

  const value = data[queryName];
  const logs = Array.isArray(value) ? value : (value?.logs ?? []);

  return logs.slice(0, 500).map((line) => ({
    timestamp: line.timestamp,
    message: line.message,
    level: line.level,
  }));
}

export async function getDashboard(
  userId: string,
  input: { workspaceIds?: string[]; statusFilter?: DeploymentStatus[] },
): Promise<DashboardResponse> {
  const workspaces = await listAuthorizedWorkspaces(userId);
  const selectedWorkspaces = input.workspaceIds?.length
    ? workspaces.filter((workspace) => input.workspaceIds?.includes(workspace.id))
    : workspaces;

  const projectsByWorkspace = await mapLimit(selectedWorkspaces, 5, async (workspace) => {
    const projects = await listProjectsForWorkspace(userId, workspace.id);
    return { workspace, projects };
  });

  const overviewInputs = projectsByWorkspace.flatMap(({ workspace, projects }) =>
    projects.map((project) => ({ workspace, project })),
  );

  const groups = await mapLimit(overviewInputs, 5, async ({ workspace, project }) => {
    const overview = await getProjectOverview(userId, project.id);
    const services = nodes(overview.services);
    const environments = nodes(overview.environments);
    const deploymentInputs = services.flatMap((service) =>
      environments.map((environment) => ({ service, environment })),
    );

    const deployments: DeploymentCard[] = (
      await mapLimit(deploymentInputs, 5, async ({ service, environment }) => {
        const [deployment] = await listDeployments(userId, overview.id, service.id, environment.id);

        if (!deployment) {
          return null;
        }

        return {
          id: deployment.id,
          status: deployment.status,
          serviceId: service.id,
          serviceName: service.name,
          environmentId: environment.id,
          environmentName: environment.name,
          projectId: overview.id,
          projectName: overview.name,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          branch: deployment.meta?.branch,
          commitSha: deployment.meta?.commitSha,
          commitMessage: deployment.meta?.commitMessage,
          createdAt: deployment.createdAt,
          updatedAt: deployment.updatedAt,
          railwayUrl: railwayDeploymentUrl(overview.id, service.id, deployment.id),
        } satisfies DeploymentCard;
      })
    ).filter((deployment): deployment is NonNullable<typeof deployment> => Boolean(deployment));

    const filteredDeployments = input.statusFilter?.length
      ? deployments.filter((deployment) => input.statusFilter?.includes(deployment.status))
      : deployments;

    return {
      id: overview.id,
      name: overview.name,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      deployments: filteredDeployments,
    } satisfies ProjectDeploymentGroup;
  });

  const visibleGroups = sortProjectGroups(groups.filter((group) => group.deployments.length > 0));
  const allDeployments = visibleGroups.flatMap((group) => group.deployments);

  return {
    workspaces: selectedWorkspaces,
    projects: visibleGroups,
    summary: {
      workspaceCount: selectedWorkspaces.length,
      projectCount: visibleGroups.length,
      serviceCount: new Set(allDeployments.map((deployment) => deployment.serviceId)).size,
      deploymentCount: allDeployments.length,
      problemCount: allDeployments.filter((deployment) => problemStatuses.has(deployment.status))
        .length,
      activeCount: allDeployments.filter((deployment) => activeStatuses.has(deployment.status))
        .length,
    },
    fetchedAt: new Date().toISOString(),
  };
}

export async function listCachedWorkspaces(userId: string) {
  return db.select().from(workspaceCache).where(eq(workspaceCache.userId, userId));
}
