export type DeploymentStatus =
  | "BUILDING"
  | "DEPLOYING"
  | "SUCCESS"
  | "FAILED"
  | "CRASHED"
  | "REMOVED"
  | "SLEEPING"
  | "SKIPPED"
  | "WAITING"
  | "QUEUED";

export type DashboardSummary = {
  workspaceCount: number;
  projectCount: number;
  serviceCount: number;
  deploymentCount: number;
  problemCount: number;
  activeCount: number;
};

export type WorkspaceSummary = {
  id: string;
  name: string;
};

export type DeploymentCard = {
  id: string;
  status: DeploymentStatus;
  serviceId: string;
  serviceName: string;
  environmentId: string;
  environmentName: string;
  projectId: string;
  projectName: string;
  workspaceId: string;
  workspaceName: string;
  branch?: string;
  commitSha?: string;
  commitMessage?: string;
  createdAt: string;
  updatedAt?: string;
  railwayUrl: string;
};

export type ProjectDeploymentGroup = {
  id: string;
  name: string;
  workspaceId: string;
  workspaceName: string;
  deployments: DeploymentCard[];
};

export type DashboardResponse = {
  summary: DashboardSummary;
  workspaces: WorkspaceSummary[];
  projects: ProjectDeploymentGroup[];
  fetchedAt: string;
};

export type DeploymentLogKind = "build" | "runtime" | "http";

export type DeploymentLogLine = {
  timestamp?: string;
  message: string;
  level?: string;
};

export type DeploymentDetail = DeploymentCard & {
  canRollback?: boolean;
  url?: string;
  meta?: Record<string, unknown>;
};
