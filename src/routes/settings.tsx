import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, PlugZap, TrainFront } from "lucide-react";
import { authClient, railwayScopes } from "../lib/auth-client";
import { orpc } from "../lib/orpc";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const viewerQuery = useQuery({
    queryKey: ["viewer", "me"],
    queryFn: () => orpc.viewer.me(),
    retry: false,
  });

  const cachedWorkspacesQuery = useQuery({
    queryKey: ["railway", "cached-workspaces"],
    queryFn: () => orpc.railway.cachedWorkspaces(),
    enabled: viewerQuery.isSuccess,
  });

  async function reconnect() {
    await authClient.signIn.oauth2({
      providerId: "railway",
      callbackURL: "/settings",
      errorCallbackURL: "/settings",
      scopes: railwayScopes,
    });
  }

  if (viewerQuery.error) {
    return (
      <main className="state-page">
        <TrainFront size={36} />
        <h1>Sign in required</h1>
        <Link to="/login" className="primary-button">
          Sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="settings-shell">
      <header className="detail-header">
        <Link to="/" className="icon-button">
          <ArrowLeft size={17} />
          Dashboard
        </Link>
      </header>
      <section className="settings-panel">
        <div className="settings-title">
          <PlugZap size={24} />
          <div>
            <h1>Railway connection</h1>
            <p>{viewerQuery.data?.user.email ?? "Loading account"}</p>
          </div>
        </div>
        <div className="metadata-grid">
          <div>
            <span>Status</span>
            <strong>{viewerQuery.data?.railway.connected ? "connected" : "not connected"}</strong>
          </div>
          <div>
            <span>Token expiry</span>
            <strong>
              {viewerQuery.data?.railway.tokenExpiresAt
                ? new Date(viewerQuery.data.railway.tokenExpiresAt).toLocaleString()
                : "unknown"}
            </strong>
          </div>
          <div>
            <span>Scope</span>
            <strong>{viewerQuery.data?.railway.scope ?? "none"}</strong>
          </div>
        </div>
        <button type="button" className="primary-button" onClick={reconnect}>
          <TrainFront size={17} />
          Reconnect Railway
        </button>
      </section>
      <section className="settings-panel">
        <h2>Seen workspaces</h2>
        <div className="workspace-list">
          {cachedWorkspacesQuery.data?.length ? (
            cachedWorkspacesQuery.data.map((workspace) => (
              <div key={workspace.id}>
                <strong>{workspace.name}</strong>
                <span>{new Date(workspace.lastSeenAt).toLocaleString()}</span>
              </div>
            ))
          ) : (
            <p>No workspace data cached yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
