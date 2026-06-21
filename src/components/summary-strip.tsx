import { Activity, Box, CircleAlert, Layers3, Rocket, Server } from "lucide-react";
import type { DashboardSummary } from "../shared/railway/types";

const items = [
  ["Projects", "projectCount", Layers3],
  ["Services", "serviceCount", Server],
  ["Deployments", "deploymentCount", Rocket],
  ["Problems", "problemCount", CircleAlert],
  ["Active", "activeCount", Activity],
  ["Workspaces", "workspaceCount", Box],
] as const;

export function SummaryStrip({ summary }: { summary: DashboardSummary }) {
  return (
    <section className="summary-strip" aria-label="Deployment summary">
      {items.map(([label, key, Icon]) => (
        <div className="summary-item" key={key}>
          <Icon size={18} />
          <div>
            <span>{label}</span>
            <strong>{summary[key]}</strong>
          </div>
        </div>
      ))}
    </section>
  );
}
