import { createFileRoute } from "@tanstack/react-router";
import { BrandLockup, BrandMark } from "../components/brand";
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
        <BrandMark size="lg" />
        <BrandLockup />
        <p>Watch Railway deployments across selected workspaces from one dashboard.</p>
        <button type="button" className="primary-button" onClick={signIn}>
          <BrandMark size="sm" />
          Sign in with Railway
        </button>
      </section>
    </main>
  );
}
