import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { RefreshCw, Settings } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { BrandMark } from "../components/brand";
import { DashboardFilters, type StatusFilter } from "../components/dashboard-filters";
import { ProjectPanel } from "../components/project-panel";
import { SummaryStrip } from "../components/summary-strip";
import { authClient } from "../lib/auth-client";
import { orpc } from "../lib/orpc";
import { deploymentActivityTime, sortProjectGroups } from "../shared/railway/status";
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

  return sortProjectGroups(
    projects
      .map((project) => ({
        ...project,
        deployments: project.deployments
          .filter((deployment) => {
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
          })
          .sort((a, b) => deploymentActivityTime(b) - deploymentActivityTime(a)),
      }))
      .filter((project) => project.deployments.length > 0),
  );
}

function useProjectGridAnimation(projects: ProjectDeploymentGroup[]) {
  const gridRef = useRef<HTMLElement | null>(null);
  const positionsRef = useRef<Map<string, DOMRect>>(new Map());
  const projectOrderKey = projects.map((project) => project.id).join("|");

  useLayoutEffect(() => {
    void projectOrderKey;

    const grid = gridRef.current;

    if (!grid || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const previousPositions = positionsRef.current;
    const nextPositions = new Map<string, DOMRect>();
    const panels = Array.from(grid.querySelectorAll<HTMLElement>("[data-project-id]"));

    for (const panel of panels) {
      const projectId = panel.dataset.projectId;

      if (!projectId) {
        continue;
      }

      const next = panel.getBoundingClientRect();
      const previous = previousPositions.get(projectId);
      nextPositions.set(projectId, next);

      if (!previous) {
        panel.animate([{ opacity: 0.78, transform: "scale(0.985)" }, { opacity: 1 }], {
          duration: 220,
          easing: "cubic-bezier(0.2, 0, 0, 1)",
        });
        continue;
      }

      const deltaX = previous.left - next.left;
      const deltaY = previous.top - next.top;

      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
        continue;
      }

      panel.animate(
        [{ transform: `translate(${deltaX}px, ${deltaY}px)` }, { transform: "translate(0, 0)" }],
        {
          duration: 420,
          easing: "cubic-bezier(0.2, 0, 0, 1)",
        },
      );
    }

    positionsRef.current = nextPositions;
  }, [projectOrderKey]);

  return gridRef;
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
  const projectGridRef = useProjectGridAnimation(visibleProjects);

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
        <section className="project-grid" ref={projectGridRef}>
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
