import { createFileRoute } from "@tanstack/react-router";
import { TrainFront } from "lucide-react";
import { authClient, railwayScopes } from "../lib/auth-client";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  async function signIn() {
    await authClient.signIn.oauth2({
      providerId: "railway",
      callbackURL: "/",
      errorCallbackURL: "/login",
      scopes: railwayScopes,
    });
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="brand-mark">
          <TrainFront size={28} />
        </div>
        <h1>RDW</h1>
        <p>Watch Railway deployments across selected workspaces from one dashboard.</p>
        <button type="button" className="primary-button" onClick={signIn}>
          <TrainFront size={18} />
          Sign in with Railway
        </button>
      </section>
    </main>
  );
}
