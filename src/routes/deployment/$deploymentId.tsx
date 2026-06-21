import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, RefreshCw } from "lucide-react";
import { useState } from "react";
import { StatusBadge } from "../../components/status-badge";
import { orpc } from "../../lib/orpc";
import type { DeploymentLogKind } from "../../shared/railway/types";

export const Route = createFileRoute("/deployment/$deploymentId")({
  component: DeploymentPage,
});

function DeploymentPage() {
  const { deploymentId } = Route.useParams();
  const [logKind, setLogKind] = useState<DeploymentLogKind>("runtime");

  const detailQuery = useQuery({
    queryKey: ["railway", "deployment", deploymentId],
    queryFn: () => orpc.railway.deploymentDetail({ deploymentId }),
    retry: 1,
  });

  const logsQuery = useQuery({
    queryKey: ["railway", "deployment", deploymentId, "logs", logKind],
    queryFn: () => orpc.railway.deploymentLogs({ deploymentId, kind: logKind }),
    enabled: detailQuery.isSuccess,
    retry: 1,
  });

  return (
    <main className="detail-shell">
      <header className="detail-header">
        <Link to="/" className="icon-button">
          <ArrowLeft size={17} />
          Back
        </Link>
        <button type="button" className="icon-button" onClick={() => logsQuery.refetch()}>
          <RefreshCw size={17} />
          Refresh logs
        </button>
      </header>

      {detailQuery.data ? (
        <section className="detail-hero">
          <div>
            <StatusBadge status={detailQuery.data.status} />
            <h1>{detailQuery.data.serviceName}</h1>
            <p>
              {detailQuery.data.projectName} / {detailQuery.data.environmentName}
            </p>
          </div>
          <a
            href={detailQuery.data.railwayUrl}
            target="_blank"
            rel="noreferrer"
            className="primary-button"
          >
            <ExternalLink size={17} />
            Open Railway
          </a>
        </section>
      ) : detailQuery.isLoading ? (
        <section className="skeleton-panel detail" />
      ) : (
        <section className="error-banner">
          <strong>Deployment unavailable.</strong>
          <span>Reconnect Railway or open the dashboard again.</span>
        </section>
      )}

      {detailQuery.data ? (
        <section className="metadata-grid">
          <div>
            <span>Branch</span>
            <strong>{detailQuery.data.branch ?? "unknown"}</strong>
          </div>
          <div>
            <span>Commit</span>
            <strong>{detailQuery.data.commitSha?.slice(0, 12) ?? "unknown"}</strong>
          </div>
          <div>
            <span>Created</span>
            <strong>{new Date(detailQuery.data.createdAt).toLocaleString()}</strong>
          </div>
          <div>
            <span>Updated</span>
            <strong>
              {detailQuery.data.updatedAt
                ? new Date(detailQuery.data.updatedAt).toLocaleString()
                : "unknown"}
            </strong>
          </div>
        </section>
      ) : null}

      <section className="logs-panel">
        <div className="logs-tabs">
          {(["runtime", "build", "http"] as const).map((kind) => (
            <button
              type="button"
              key={kind}
              className={logKind === kind ? "selected" : ""}
              onClick={() => setLogKind(kind)}
            >
              {kind}
            </button>
          ))}
        </div>
        <pre>
          {logsQuery.isLoading
            ? "Loading logs..."
            : logsQuery.data?.length
              ? logsQuery.data
                  .map((line) =>
                    `${line.timestamp ?? ""} ${line.level ?? ""} ${line.message}`.trim(),
                  )
                  .join("\n")
              : "No logs returned."}
        </pre>
      </section>
    </main>
  );
}
