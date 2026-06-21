import { Search } from "lucide-react";
import type { WorkspaceSummary } from "../shared/railway/types";

export type StatusFilter = "all" | "active" | "problems" | "success";

const statusLabels: Record<StatusFilter, string> = {
  all: "All",
  active: "Active",
  problems: "Problems",
  success: "Success",
};

export function DashboardFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  workspaces,
  selectedWorkspace,
  onWorkspaceChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  workspaces: WorkspaceSummary[];
  selectedWorkspace: string;
  onWorkspaceChange: (value: string) => void;
}) {
  return (
    <div className="filters">
      <label className="search-field">
        <Search size={16} />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search projects, services, branches"
        />
      </label>
      <fieldset className="segmented" aria-label="Status filter">
        {(["all", "active", "problems", "success"] as const).map((value) => (
          <button
            type="button"
            className={statusFilter === value ? "selected" : ""}
            key={value}
            onClick={() => onStatusFilterChange(value)}
          >
            {statusLabels[value]}
          </button>
        ))}
      </fieldset>
      {workspaces.length > 1 ? (
        <select
          value={selectedWorkspace}
          onChange={(event) => onWorkspaceChange(event.target.value)}
        >
          <option value="">All workspaces</option>
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
