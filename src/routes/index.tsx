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

const livePollMs = 5_000;

function statusMatchesFilter(status: DeploymentStatus, filter: StatusFilter) {
  if (filter === "active") {
    return ["BUILDING", "DEPLOYING", "QUEUED", "WAITING"].includes(status);
  }

  if (filter === "problems") {
    return ["FAILED", "CRASHED"].includes(status);
  }

  if (filter === "success") {
    return status === "SUCCESS";
  }

  return true;
}

function filterProjects(
  projects: ProjectDeploymentGroup[],
  search: string,
  statusFilter: StatusFilter,
) {
  const query = search.trim().toLowerCase();

  return projects
    .map((project) => ({
      ...project,
      deployments: project.deployments.filter((deployment) => {
        if (!statusMatchesFilter(deployment.status, statusFilter)) {
          return false;
        }

        if (!query) {
          return true;
        }

        return [
          project.name,
          deployment.serviceName,
          deployment.environmentName,
          deployment.branch,
          deployment.commitSha,
          deployment.commitMessage,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      }),
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
    queryKey: ["railway", "dashboard", selectedWorkspace],
    queryFn: () =>
      orpc.railway.dashboard({
        workspaceIds: selectedWorkspace ? [selectedWorkspace] : undefined,
      }),
    enabled: viewerQuery.isSuccess,
    staleTime: 2_000,
    refetchInterval: (query) => (query.state.error ? false : livePollMs),
    refetchIntervalInBackground: false,
    retry: 1,
  });

  const visibleProjects = useMemo(
    () => filterProjects(dashboardQuery.data?.projects ?? [], search, statusFilter),
    [dashboardQuery.data?.projects, search, statusFilter],
  );

  async function signOut() {
    await authClient.signOut();
    window.location.href = "/login";
  }

  const fetchedAt = dashboardQuery.data?.fetchedAt
    ? new Date(dashboardQuery.data.fetchedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

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
          <span className="live-pill" title="Refreshes every 5 seconds while this tab is visible">
            <span />
            Live 5s
          </span>
          {fetchedAt ? <span className="sync-time">Updated {fetchedAt}</span> : null}
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
          <h2>{statusFilter === "active" ? "No active deployments" : "No deployments found"}</h2>
          <p>
            {statusFilter === "active"
              ? "The live dashboard will surface builds, deploys, queued, and waiting deployments here."
              : "Push to a connected Railway project or adjust the filters."}
          </p>
        </section>
      )}
    </main>
  );
}
