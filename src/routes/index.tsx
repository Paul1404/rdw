import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { RefreshCw, Settings } from "lucide-react";
import { useMemo, useState } from "react";
import { BrandMark } from "../components/brand";
import { DashboardFilters, type StatusFilter } from "../components/dashboard-filters";
import { ProjectPanel } from "../components/project-panel";
import { SummaryStrip } from "../components/summary-strip";
import { authClient } from "../lib/auth-client";
import { orpc } from "../lib/orpc";
import type { DeploymentStatus, ProjectDeploymentGroup } from "../shared/railway/types";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function statusesForFilter(filter: StatusFilter): DeploymentStatus[] | undefined {
  if (filter === "active") {
    return ["BUILDING", "DEPLOYING", "QUEUED", "WAITING"];
  }

  if (filter === "problems") {
    return ["FAILED", "CRASHED"];
  }

  if (filter === "success") {
    return ["SUCCESS"];
  }

  return undefined;
}

function filterProjects(projects: ProjectDeploymentGroup[], search: string) {
  const query = search.trim().toLowerCase();

  if (!query) {
    return projects;
  }

  return projects
    .map((project) => ({
      ...project,
      deployments: project.deployments.filter((deployment) =>
        [
          project.name,
          deployment.serviceName,
          deployment.environmentName,
          deployment.branch,
          deployment.commitSha,
          deployment.commitMessage,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query)),
      ),
    }))
    .filter((project) => project.deployments.length > 0);
}

function DashboardPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedWorkspace, setSelectedWorkspace] = useState("");

  const viewerQuery = useQuery({
    queryKey: ["viewer", "me"],
    queryFn: () => orpc.viewer.me(),
    retry: false,
  });

  const dashboardQuery = useQuery({
    queryKey: ["railway", "dashboard", selectedWorkspace, statusFilter],
    queryFn: () =>
      orpc.railway.dashboard({
        workspaceIds: selectedWorkspace ? [selectedWorkspace] : undefined,
        statusFilter: statusesForFilter(statusFilter),
      }),
    enabled: viewerQuery.isSuccess,
    staleTime: 10_000,
    refetchInterval: (query) => (query.state.error ? false : 20_000),
    refetchIntervalInBackground: false,
    retry: 1,
  });

  const visibleProjects = useMemo(
    () => filterProjects(dashboardQuery.data?.projects ?? [], search),
    [dashboardQuery.data?.projects, search],
  );

  async function signOut() {
    await authClient.signOut();
    window.location.href = "/login";
  }

  if (viewerQuery.error) {
    return (
      <main className="state-page">
        <BrandMark size="lg" />
        <h1>Sign in to RDW</h1>
        <p>Your Railway deployment dashboard needs an active session.</p>
        <Link to="/login" className="primary-button">
          Sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <BrandMark size="sm" />
          <div>
            <h1>RDW</h1>
            <p>{viewerQuery.data?.user.email ?? "Loading session"}</p>
          </div>
        </div>
        <div className="topbar-actions">
          <button type="button" className="icon-button" onClick={() => dashboardQuery.refetch()}>
            <RefreshCw size={17} />
            Refresh
          </button>
          <Link to="/settings" className="icon-button">
            <Settings size={17} />
            Settings
          </Link>
          <button type="button" className="ghost-button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      {dashboardQuery.data ? <SummaryStrip summary={dashboardQuery.data.summary} /> : null}

      <DashboardFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        workspaces={dashboardQuery.data?.workspaces ?? []}
        selectedWorkspace={selectedWorkspace}
        onWorkspaceChange={setSelectedWorkspace}
      />

      {dashboardQuery.error ? (
        <section className="error-banner">
          <strong>Railway data is unavailable.</strong>
          <span>Reconnect Railway or try again in a moment.</span>
          <Link to="/settings">Open settings</Link>
        </section>
      ) : null}

      {dashboardQuery.isLoading ? (
        <section className="loading-grid">
          {["a", "b", "c", "d", "e", "f"].map((key) => (
            <div className="skeleton-panel" key={key} />
          ))}
        </section>
      ) : visibleProjects.length ? (
        <section className="project-grid">
          {visibleProjects.map((project) => (
            <ProjectPanel project={project} key={project.id} />
          ))}
        </section>
      ) : (
        <section className="empty-state">
          <h2>No deployments found</h2>
          <p>Push to a connected Railway project or adjust the filters.</p>
        </section>
      )}
    </main>
  );
}
