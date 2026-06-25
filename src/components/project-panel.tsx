import { Link } from "@tanstack/react-router";
import { Clock3, ExternalLink, Sparkles, Timer } from "lucide-react";
import { isActiveStatus, isProblemStatus } from "../shared/railway/status";
import type { DeploymentCard, ProjectDeploymentGroup } from "../shared/railway/types";
import { StatusBadge } from "./status-badge";

// A deploy that finished this recently gets a subtle "new" highlight.
const freshWindowMs = 5 * 60_000;
// Cap on a believable build+deploy duration. Guards against clock skew and the
// future updatedAt Railway sometimes reports for idle services.
const maxDurationMs = 6 * 60 * 60_000;

function relativeAge(date: string, now: number) {
  const diff = Math.max(0, now - new Date(date).getTime());
  const minutes = Math.floor(diff / 60_000);

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    return `${hours}h ago`;
  }

  return `${Math.floor(hours / 24)}d ago`;
}

function elapsedTime(date: string, now: number) {
  const diff = Math.max(0, now - new Date(date).getTime());
  const seconds = Math.floor(diff / 1_000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${String(minutes % 60).padStart(2, "0")}m`;
  }

  return `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`;
}

function formatDuration(ms: number) {
  const totalSeconds = Math.round(ms / 1_000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3_600);

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }

  return `${seconds}s`;
}

// How long the build + deploy took: createdAt -> updatedAt on a finished
// deployment. Returns null when the window is missing or implausible.
function deployDurationMs(deployment: DeploymentCard) {
  if (!deployment.updatedAt) {
    return null;
  }

  const start = new Date(deployment.createdAt).getTime();
  const end = new Date(deployment.updatedAt).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return null;
  }

  const duration = end - start;

  if (duration < 1_000 || duration > maxDurationMs) {
    return null;
  }

  return duration;
}

function finishedAt(deployment: DeploymentCard) {
  return deployment.updatedAt ?? deployment.createdAt;
}

function isFreshDeploy(deployment: DeploymentCard, now: number) {
  if (deployment.status !== "SUCCESS") {
    return false;
  }

  const age = now - new Date(finishedAt(deployment)).getTime();
  return age >= 0 && age < freshWindowMs;
}

function shortSha(deployment: DeploymentCard) {
  return deployment.commitSha ? deployment.commitSha.slice(0, 7) : null;
}

export function ProjectPanel({ now, project }: { now: number; project: ProjectDeploymentGroup }) {
  return (
    <section className="project-panel" data-project-id={project.id}>
      <header className="project-header">
        <div>
          <h2>{project.name}</h2>
          <p>{project.workspaceName}</p>
        </div>
        <span>{project.deployments.length}</span>
      </header>
      <div className="deployment-list">
        {project.deployments.map((deployment) => {
          const isActive = isActiveStatus(deployment.status);
          const isProblem = isProblemStatus(deployment.status);
          const isFresh = isFreshDeploy(deployment, now);
          const duration = isActive ? null : deployDurationMs(deployment);
          const durationVerb = isProblem ? "Failed after" : "Deployed in";

          const rowClassName = [
            "deployment-row",
            isActive ? "deployment-row-active" : "",
            isFresh ? "deployment-row-fresh" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <article className={rowClassName} key={deployment.id}>
              <div className="deployment-main">
                <StatusBadge status={deployment.status} />
                <Link
                  to="/deployment/$deploymentId"
                  params={{ deploymentId: deployment.id }}
                  className="deployment-name"
                  title={deployment.serviceName}
                >
                  {deployment.serviceName}
                </Link>
                <span className="environment" title={deployment.environmentName}>
                  {deployment.environmentName}
                </span>
              </div>
              <div className="deployment-meta">
                {isFresh ? (
                  <span className="deployment-fresh" title="Deployed in the last few minutes">
                    <Sparkles size={12} />
                    new
                  </span>
                ) : null}
                {deployment.branch ? <span>{deployment.branch}</span> : null}
                {shortSha(deployment) ? <span>{shortSha(deployment)}</span> : null}
                {isActive ? (
                  <span className="deployment-timer" title="Time since this deployment started">
                    <Clock3 size={13} />
                    {elapsedTime(deployment.createdAt, now)}
                  </span>
                ) : (
                  <>
                    {duration !== null ? (
                      <span
                        className="deployment-duration"
                        title={`${durationVerb} ${formatDuration(duration)}`}
                      >
                        <Timer size={13} />
                        {formatDuration(duration)}
                      </span>
                    ) : null}
                    <span
                      className="deployment-age"
                      title={new Date(finishedAt(deployment)).toLocaleString()}
                    >
                      {relativeAge(finishedAt(deployment), now)}
                    </span>
                  </>
                )}
                <a
                  href={deployment.railwayUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open Railway"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
              {deployment.commitMessage ? (
                <p className="commit-message" title={deployment.commitMessage}>
                  {deployment.commitMessage}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
