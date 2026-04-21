// Unified data interface — swap mock ↔ supabase by flipping NEXT_PUBLIC_DATA_ADAPTER.
// All UI code depends on this surface, NOT on Supabase directly.

import type {
  Board,
  EdgeRow,
  EdgeInput,
  NodeRow,
  NodeInput,
  Project,
  Workspace,
} from "./supabase/types";
import {
  MOCK_BOARD,
  MOCK_EDGES,
  MOCK_NODES,
  MOCK_PROJECT,
  MOCK_WORKSPACE,
} from "./mock/data";

export interface CreateProjectInput {
  name: string;
  client?: string;
  product?: string;
  aspect?: string;
  brief?: Record<string, unknown>;
}

export interface DataAdapter {
  listWorkspaces(): Promise<Workspace[]>;
  listProjects(workspaceId: string): Promise<Project[]>;
  getProject(projectId: string): Promise<Project | null>;
  createProject(workspaceId: string, input: CreateProjectInput): Promise<Project>;
  updateProject(projectId: string, patch: Partial<Project>): Promise<Project>;
  deleteProject(projectId: string): Promise<void>;
  listBoards(projectId: string): Promise<Board[]>;
  listNodes(boardId: string): Promise<NodeRow[]>;
  listEdges(boardId: string): Promise<EdgeRow[]>;
  createNode(input: NodeInput): Promise<NodeRow>;
  updateNode(id: string, patch: Partial<NodeRow>): Promise<NodeRow>;
  deleteNode(id: string): Promise<void>;
  createEdge(input: EdgeInput): Promise<EdgeRow>;
  deleteEdge(id: string): Promise<void>;
}

// ─────────────────────────────────────────────────────────
// Mock adapter — holds state in-memory per page load
// ─────────────────────────────────────────────────────────

const LS_KEY = "ff.mock.state.v1";

interface MockState {
  projects: Project[];
  boards: Board[];
  nodes: NodeRow[];
  edges: EdgeRow[];
}

function loadMockState(): MockState {
  if (typeof window === "undefined") {
    return {
      projects: [MOCK_PROJECT],
      boards: [MOCK_BOARD],
      nodes: [...MOCK_NODES],
      edges: [...MOCK_EDGES],
    };
  }
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as MockState;
  } catch {
    /* ignore */
  }
  // First visit — seed the demo project only (real projects start empty)
  return {
    projects: [MOCK_PROJECT],
    boards: [MOCK_BOARD],
    nodes: [...MOCK_NODES],
    edges: [...MOCK_EDGES],
  };
}

function persist(state: MockState) {
  if (typeof window === "undefined") return;
  try {
    const stripped: MockState = {
      ...state,
      nodes: state.nodes.map(n => ({
        ...n,
        image_url: n.image_url?.startsWith('data:') ? null : n.image_url,
        thumbnail_url: (n as any).thumbnail_url?.startsWith?.('data:') ? null : (n as any).thumbnail_url,
      })),
    };
    localStorage.setItem(LS_KEY, JSON.stringify(stripped));
  } catch {
    /* ignore */
  }
}

function makeMockAdapter(): DataAdapter {
  const workspaces = [MOCK_WORKSPACE];
  const state = loadMockState();
  const { projects, boards, nodes, edges } = state;

  const save = () => persist(state);

  const uid = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : "mock_" + Math.random().toString(36).slice(2);

  return {
    async listWorkspaces() {
      return workspaces;
    },
    async listProjects(workspaceId) {
      return projects
        .filter((p) => p.workspace_id === workspaceId && p.status !== "deleted")
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
    },
    async getProject(projectId) {
      return projects.find((p) => p.id === projectId) ?? null;
    },
    async createProject(workspaceId, input) {
      const now = new Date().toISOString();
      const project: Project = {
        id: uid(),
        workspace_id: workspaceId,
        created_by_user_id: "user_ori",
        name: input.name,
        client: input.client ?? null,
        product: input.product ?? null,
        brief: (input.brief as Project["brief"]) ?? {},
        aspect: input.aspect ?? "9:16",
        status: "active",
        cover_image_url: null,
        created_at: now,
        updated_at: now,
      };
      projects.push(project);
      // Create a default empty board
      const board: Board = {
        id: uid(),
        project_id: project.id,
        name: "Board 1",
        is_default: true,
        order_index: 0,
        created_at: now,
      };
      boards.push(board);
      save();
      return project;
    },
    async updateProject(projectId, patch) {
      const idx = projects.findIndex((p) => p.id === projectId);
      if (idx === -1) throw new Error("project not found");
      const updated: Project = {
        ...projects[idx],
        ...patch,
        updated_at: new Date().toISOString(),
      };
      projects[idx] = updated;
      save();
      return updated;
    },
    async deleteProject(projectId) {
      const idx = projects.findIndex((p) => p.id === projectId);
      if (idx !== -1) projects.splice(idx, 1);
      // Cascade
      const boardIds = boards
        .filter((b) => b.project_id === projectId)
        .map((b) => b.id);
      for (let i = boards.length - 1; i >= 0; i--) {
        if (boards[i].project_id === projectId) boards.splice(i, 1);
      }
      for (let i = nodes.length - 1; i >= 0; i--) {
        if (boardIds.includes(nodes[i].board_id)) nodes.splice(i, 1);
      }
      for (let i = edges.length - 1; i >= 0; i--) {
        if (boardIds.includes(edges[i].board_id)) edges.splice(i, 1);
      }
      save();
    },
    async listBoards(projectId) {
      return boards.filter((b) => b.project_id === projectId);
    },
    async listNodes(boardId) {
      return nodes.filter((n) => n.board_id === boardId);
    },
    async listEdges(boardId) {
      return edges.filter((e) => e.board_id === boardId);
    },
    async createNode(input) {
      const row: NodeRow = {
        ...input,
        id: input.id || uid(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as NodeRow;
      nodes.push(row);
      save();
      return row;
    },
    async updateNode(id, patch) {
      const idx = nodes.findIndex((n) => n.id === id);
      if (idx === -1) throw new Error("node not found");
      const updated = {
        ...nodes[idx],
        ...patch,
        updated_at: new Date().toISOString(),
      } as NodeRow;
      nodes[idx] = updated;
      save();
      return updated;
    },
    async deleteNode(id) {
      const idx = nodes.findIndex((n) => n.id === id);
      if (idx !== -1) nodes.splice(idx, 1);
      save();
    },
    async createEdge(input) {
      const row: EdgeRow = {
        ...input,
        id: input.id || uid(),
        created_at: new Date().toISOString(),
      } as EdgeRow;
      edges.push(row);
      save();
      return row;
    },
    async deleteEdge(id) {
      const idx = edges.findIndex((e) => e.id === id);
      if (idx !== -1) edges.splice(idx, 1);
      save();
    },
  };
}

// ─────────────────────────────────────────────────────────
// Supabase adapter — lazy import to keep mock-only bundles lean
// ─────────────────────────────────────────────────────────

async function makeSupabaseAdapter(): Promise<DataAdapter> {
  const { createClient } = await import("./supabase/client");
  // Cast client to any for insert/update flexibility — our Database type is
  // structurally correct but Supabase's inference occasionally trips on the
  // simplified schema. Runtime behaviour is fully typed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createClient() as any;

  return {
    async listWorkspaces() {
      const { data, error } = await sb.from("workspaces").select("*");
      if (error) throw error;
      return (data ?? []) as Workspace[];
    },
    async listProjects(workspaceId) {
      const { data } = await sb
        .from("projects")
        .select("*")
        .eq("workspace_id", workspaceId)
        .neq("status", "deleted")
        .order("updated_at", { ascending: false });
      return (data ?? []) as Project[];
    },
    async getProject(projectId) {
      try {
        const { data } = await sb
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .maybeSingle();
        return (data ?? null) as Project | null;
      } catch (e) {
        console.warn("[data-adapter] getProject failed:", e);
        return null;
      }
    },
    async createProject(workspaceId, input) {
      const { data, error } = await sb
        .from("projects")
        .insert({
          workspace_id: workspaceId,
          name: input.name,
          client: input.client ?? null,
          product: input.product ?? null,
          aspect: input.aspect ?? "9:16",
          brief: input.brief ?? {},
        })
        .select("*")
        .single();
      if (error) throw error;
      // Create default board
      await sb
        .from("boards")
        .insert({
          project_id: data.id,
          name: "Board 1",
          is_default: true,
          order_index: 0,
        });
      return data as Project;
    },
    async updateProject(projectId, patch) {
      const { data, error } = await sb
        .from("projects")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", projectId)
        .select("*")
        .single();
      if (error) throw error;
      return data as Project;
    },
    async deleteProject(projectId) {
      const { error } = await sb.from("projects").delete().eq("id", projectId);
      if (error) throw error;
    },
    async listBoards(projectId) {
      try {
        const { data, error } = await sb
          .from("boards")
          .select("*")
          .eq("project_id", projectId)
          .order("order_index");
        if (error) throw error;
        return (data ?? []) as Board[];
      } catch (e) {
        console.warn("[data-adapter] listBoards failed:", e);
        return [];
      }
    },
    async listNodes(boardId) {
      try {
        const { data, error } = await sb
          .from("nodes")
          .select("*")
          .eq("board_id", boardId);
        if (error) throw error;
        return (data ?? []) as NodeRow[];
      } catch (e) {
        console.warn("[data-adapter] listNodes failed:", e);
        return [];
      }
    },
    async listEdges(boardId) {
      try {
        const { data, error } = await sb
          .from("edges")
          .select("*")
          .eq("board_id", boardId);
        if (error) throw error;
        return (data ?? []) as EdgeRow[];
      } catch (e) {
        console.warn("[data-adapter] listEdges failed:", e);
        return [];
      }
    },
    async createNode(input) {
      const { data, error } = await sb
        .from("nodes")
        .insert(input)
        .select("*")
        .single();
      if (error) throw error;
      return data as NodeRow;
    },
    async updateNode(id, patch) {
      const { data, error } = await sb
        .from("nodes")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as NodeRow;
    },
    async deleteNode(id) {
      const { error } = await sb.from("nodes").delete().eq("id", id);
      if (error) throw error;
    },
    async createEdge(input) {
      const { data, error } = await sb
        .from("edges")
        .insert(input)
        .select("*")
        .single();
      if (error) throw error;
      return data as EdgeRow;
    },
    async deleteEdge(id) {
      const { error } = await sb.from("edges").delete().eq("id", id);
      if (error) throw error;
    },
  };
}

// ─────────────────────────────────────────────────────────
// Public entry — returns the active adapter
// ─────────────────────────────────────────────────────────

let cached: DataAdapter | Promise<DataAdapter> | null = null;

export function getDataAdapter(): DataAdapter | Promise<DataAdapter> {
  if (cached) return cached;
  const mode = (process.env.NEXT_PUBLIC_DATA_ADAPTER ?? "mock").trim();
  cached = mode === "supabase" ? makeSupabaseAdapter() : makeMockAdapter();
  return cached;
}
