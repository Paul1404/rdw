import { Link } from "@tanstack/react-router";
import { Clock3, ExternalLink } from "lucide-react";
import { isActiveStatus } from "../shared/railway/status";
import type { DeploymentCard, ProjectDeploymentGroup } from "../shared/railway/types";
import { StatusBadge } from "./status-badge";

function relativeAge(date: string, now: number) {
  const diff = Math.max(0, now - new Date(date).getTime());
  const minutes = Math.floor(diff / 60_000);

  if (minutes < 1) {
    return "now";
  }

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    return `${hours}h`;
  }

  return `${Math.floor(hours / 24)}d`;
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

          return (
            <article
              className={isActive ? "deployment-row deployment-row-active" : "deployment-row"}
              key={deployment.id}
            >
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
                {deployment.branch ? <span>{deployment.branch}</span> : null}
                {shortSha(deployment) ? <span>{shortSha(deployment)}</span> : null}
                {isActive ? (
                  <span className="deployment-timer" title="Time since this deployment started">
                    <Clock3 size={13} />
                    {elapsedTime(deployment.createdAt, now)}
                  </span>
                ) : (
                  <span>{relativeAge(deployment.createdAt, now)}</span>
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
