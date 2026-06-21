import { ORPCError, os } from "@orpc/server";
import * as v from "valibot";
import type { DeploymentStatus } from "../../shared/railway/types";
import { getSessionFromHeaders } from "../auth/auth.server";
import {
  getDashboard,
  getDeployment,
  getDeploymentLogs,
  listAuthorizedWorkspaces,
  listCachedWorkspaces,
} from "../railway/queries.server";
import { getStoredRailwayToken } from "../railway/tokens.server";

export type RpcContext = {
  headers: Headers;
};

const DeploymentStatusSchema = v.picklist([
  "BUILDING",
  "DEPLOYING",
  "SUCCESS",
  "FAILED",
  "CRASHED",
  "REMOVED",
  "SLEEPING",
  "SKIPPED",
  "WAITING",
  "QUEUED",
] as const);

const base = os.$context<RpcContext>();

const protectedProcedure = base.use(async ({ context, next }) => {
  const session = await getSessionFromHeaders(context.headers);

  if (!session?.user) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Sign in before using RDW",
    });
  }

  return next({
    context: {
      session,
      user: session.user,
    },
  });
});

export const router = {
  viewer: {
    me: protectedProcedure.handler(async ({ context }) => {
      const token = await getStoredRailwayToken(context.user.id);

      return {
        user: context.user,
        railway: {
          connected: Boolean(token),
          tokenExpiresAt: token?.accessTokenExpiresAt.toISOString() ?? null,
          scope: token?.scope ?? null,
        },
      };
    }),
  },
  railway: {
    workspaces: protectedProcedure.handler(async ({ context }) =>
      listAuthorizedWorkspaces(context.user.id),
    ),
    cachedWorkspaces: protectedProcedure.handler(async ({ context }) =>
      listCachedWorkspaces(context.user.id),
    ),
    dashboard: protectedProcedure
      .input(
        v.optional(
          v.object({
            workspaceIds: v.optional(v.array(v.string())),
            statusFilter: v.optional(v.array(DeploymentStatusSchema)),
          }),
          {},
        ),
      )
      .handler(async ({ context, input }) =>
        getDashboard(context.user.id, {
          workspaceIds: input.workspaceIds,
          statusFilter: input.statusFilter as DeploymentStatus[] | undefined,
        }),
      ),
    deploymentDetail: protectedProcedure
      .input(v.object({ deploymentId: v.string() }))
      .handler(async ({ context, input }) => getDeployment(context.user.id, input.deploymentId)),
    deploymentLogs: protectedProcedure
      .input(
        v.object({
          deploymentId: v.string(),
          kind: v.picklist(["build", "runtime", "http"] as const),
        }),
      )
      .handler(async ({ context, input }) =>
        getDeploymentLogs(context.user.id, input.deploymentId, input.kind),
      ),
  },
};

export type AppRouter = typeof router;
