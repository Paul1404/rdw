import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import type { DeploymentCard, ProjectDeploymentGroup } from "../shared/railway/types";
import { StatusBadge } from "./status-badge";

function relativeAge(date: string) {
  const diff = Math.max(0, Date.now() - new Date(date).getTime());
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

function shortSha(deployment: DeploymentCard) {
  return deployment.commitSha ? deployment.commitSha.slice(0, 7) : "unknown";
}

export function ProjectPanel({ project }: { project: ProjectDeploymentGroup }) {
  return (
    <section className="project-panel">
      <header className="project-header">
        <div>
          <h2>{project.name}</h2>
          <p>{project.workspaceName}</p>
        </div>
        <span>{project.deployments.length}</span>
      </header>
      <div className="deployment-list">
        {project.deployments.map((deployment) => (
          <article className="deployment-row" key={deployment.id}>
            <div className="deployment-main">
              <StatusBadge status={deployment.status} />
              <Link
                to="/deployment/$deploymentId"
                params={{ deploymentId: deployment.id }}
                className="deployment-name"
              >
                {deployment.serviceName}
              </Link>
              <span className="environment">{deployment.environmentName}</span>
            </div>
            <div className="deployment-meta">
              <span>{deployment.branch ?? "no branch"}</span>
              <span>{shortSha(deployment)}</span>
              <span>{relativeAge(deployment.createdAt)}</span>
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
              <p className="commit-message">{deployment.commitMessage}</p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
