'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Node,
  type Edge,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import {
  Activity,
  Bot,
  Boxes,
  CircleHelp,
  GitBranch,
  Plus,
  Settings2,
  Workflow as WorkflowIcon,
  Zap,
  Save,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
} from 'lucide-react';

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
).replace(/\/$/, '');

type AIProvider = "groq" | "openai";

interface AgentConfig {
  instructions: string;
  provider: AIProvider;
  model: string;
  temperature: number;
  maxTokens: number;
}

const DEFAULT_AGENT_CONFIG: AgentConfig = {
  instructions: "You are a helpful AI agent. Process the input accurately.",
  provider: "groq",
  model: "openai/gpt-oss-20b",
  temperature: 0.3,
  maxTokens: 1000,
};

const PROVIDER_MODELS: Record<
  AIProvider,
  { value: string; label: string }[]
> = {
  groq: [
    {
      value: "openai/gpt-oss-20b",
      label: "GPT OSS 20B",
    },
    {
      value: "llama-3.3-70b-versatile",
      label: "Llama 3.3 70B",
    },
  ],
  openai: [
    {
      value: "gpt-4o-mini",
      label: "GPT-4o Mini",
    },
  ],
};

const DEFAULT_PROVIDER_MODELS: Record<AIProvider, string> = {
  groq: "openai/gpt-oss-20b",
  openai: "gpt-4o-mini",
};

function normalizeAgentConfig(
  config?: Partial<AgentConfig>
): AgentConfig {
  const provider: AIProvider =
    config?.provider ??
    (config?.model === "gpt-4o-mini" ? "openai" : "groq");

  const savedModel = config?.model;
  const modelIsCompatible = PROVIDER_MODELS[provider].some(
    (item) => item.value === savedModel
  );

  return {
    ...DEFAULT_AGENT_CONFIG,
    ...config,
    provider,
    model: modelIsCompatible
      ? savedModel!
      : DEFAULT_PROVIDER_MODELS[provider],
  };
}


interface WorkflowRecord {
  id: string;
  name: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
  created_at: string;
  updated_at: string;
}

const COLORS: Record<string, string> = {
  trigger: '#123b36',
  agent: '#172d50',
  tool: '#34234c',
  condition: '#45351a',
  output: '#3b2630',
};

function nodeStyle(type: string) {
  return {
    background: COLORS[type] || '#172d50',
    color: '#f8fafc',
    border: '1px solid #334155',
    borderRadius: 12,
    padding: 16,
    minWidth: 190,
    fontSize: 13,
    fontWeight: 600,
  };
}

function starterNodes(): Node[] {
  return [
    {
      id: 'trigger',
      position: { x: 80, y: 150 },
      data: { label: 'Webhook Trigger', nodeType: 'trigger' },
      style: nodeStyle('trigger'),
    },
    {
      id: 'agent',
      position: { x: 360, y: 150 },
      data: { label: 'AI Agent · Lead Qualifier', nodeType: 'agent' },
      style: nodeStyle('agent'),
    },
    {
      id: 'condition',
      position: { x: 660, y: 150 },
      data: { label: 'Qualification Check', nodeType: 'condition' },
      style: nodeStyle('condition'),
    },
    {
      id: 'output',
      position: { x: 960, y: 150 },
      data: { label: 'Create CRM Lead', nodeType: 'output' },
      style: nodeStyle('output'),
    },
  ];
}

function starterEdges(): Edge[] {
  return [
    { id: 'e1', source: 'trigger', target: 'agent', animated: true },
    { id: 'e2', source: 'agent', target: 'condition', animated: true },
    { id: 'e3', source: 'condition', target: 'output', animated: true },
  ];
}

export default function Home() {
  const [nodes, setNodes, onNodesChange] = useNodesState(starterNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(starterEdges());

  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('Untitled workflow');
  const [description, setDescription] = useState('');
  const [nodeType, setNodeType] = useState('agent');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('agent');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const refreshWorkflows = useCallback(async () => {
    const response = await fetch(`${API_URL}/api/workflows`);

    if (!response.ok) {
      throw new Error('Could not retrieve workflows from the API.');
    }

    const data: WorkflowRecord[] = await response.json();
    setWorkflows(data);
    return data;
  }, []);

  const loadWorkflow = useCallback((workflow: WorkflowRecord) => {
    setActiveId(workflow.id);
    setWorkflowName(workflow.name);
    setDescription(workflow.description || '');
    setNodes(workflow.nodes || []);
    setEdges(workflow.edges || []);
    setSelectedNodeId(
      workflow.nodes.find((node) => node.data.nodeType === "agent")?.id ?? null
    );
    setDirty(false);
    setNotice(`Loaded "${workflow.name}"`);
    setError('');
  }, [setNodes, setEdges]);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const response = await fetch(`${API_URL}/api/workflows`);

        if (!response.ok) {
          throw new Error('Backend connection failed.');
        }

        const data: WorkflowRecord[] = await response.json();

        if (!mounted) return;

        setWorkflows(data);

        if (data.length > 0) {
          const latest = data[0];
          setActiveId(latest.id);
          setWorkflowName(latest.name);
          setDescription(latest.description || '');
          setNodes(latest.nodes || []);
          setEdges(latest.edges || []);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Could not connect to the backend.'
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, [setNodes, setEdges]);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((current) =>
      addEdge({ ...connection, animated: true }, current)
    );
    setDirty(true);
  }, [setEdges]);

  const addNode = () => {
    const id = `${nodeType}-${Date.now()}`;

    const labels: Record<string, string> = {
      trigger: 'New Trigger',
      agent: 'New AI Agent',
      tool: 'New Tool',
      condition: 'New Condition',
      output: 'New Output',
    };

    const newNode: Node = {
      id,
      position: {
        x: 180 + Math.random() * 350,
        y: 320 + Math.random() * 150,
      },
      data: {
        label: labels[nodeType],
        nodeType,
      },
      style: nodeStyle(nodeType),
    };

    setNodes((current) => [...current, newNode]);
    if (nodeType === "agent") setSelectedNodeId(id);
    setDirty(true);
    setNotice(`${labels[nodeType]} added`);
    setError('');
  };

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const selectedAgentConfig = normalizeAgentConfig(
    selectedNode?.data.agentConfig as Partial<AgentConfig> | undefined
  );

  const updateAgentConfig = (
    key: keyof AgentConfig,
    value: string | number
  ) => {
    if (!selectedNode || selectedNode.data.nodeType !== "agent") return;

    setNodes((current) =>
      current.map((node) =>
        node.id === selectedNode.id
          ? {
              ...node,
              data: {
                ...node.data,
                agentConfig: {
                  ...normalizeAgentConfig(
                    node.data.agentConfig as Partial<AgentConfig> | undefined
                  ),
                  [key]: value,
                },
              },
            }
          : node
      )
    );

    setDirty(true);
    setNotice("Agent settings updated. Save your workflow to keep changes.");
  };

  const updateAgentProvider = (provider: AIProvider) => {
    if (!selectedNode || selectedNode.data.nodeType !== "agent") return;

    setNodes((current) =>
      current.map((node) =>
        node.id === selectedNode.id
          ? {
              ...node,
              data: {
                ...node.data,
                agentConfig: {
                  ...normalizeAgentConfig(
                    node.data.agentConfig as Partial<AgentConfig> | undefined
                  ),
                  provider,
                  model: DEFAULT_PROVIDER_MODELS[provider],
                },
              },
            }
          : node
      )
    );

    setDirty(true);
    setNotice("AI provider changed. Save your workflow to keep changes.");
  };

  const createNewWorkflow = () => {
    setSelectedNodeId("agent");
    setActiveId(null);
    setWorkflowName('Untitled workflow');
    setDescription('');
    setNodes(starterNodes());
    setEdges(starterEdges());
    setDirty(true);
    setNotice('New workflow started');
    setError('');
  };

  const saveWorkflow = async () => {
    if (!workflowName.trim()) {
      setError('Please enter a workflow name.');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const payload = {
        name: workflowName.trim(),
        description,
        nodes,
        edges,
      };

      const response = await fetch(
        activeId
          ? `${API_URL}/api/workflows/${activeId}`
          : `${API_URL}/api/workflows`,
        {
          method: activeId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const details = await response.text();
        throw new Error(details || 'Workflow could not be saved.');
      }

      const saved: WorkflowRecord = await response.json();

      setActiveId(saved.id);
      setWorkflowName(saved.name);
      setDirty(false);

      const updated = await refreshWorkflows();

      setNotice(`"${saved.name}" saved successfully`);
      setWorkflows(updated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to save workflow.'
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteWorkflow = async () => {
    if (!activeId) {
      createNewWorkflow();
      return;
    }

    if (!window.confirm(`Delete "${workflowName}" permanently?`)) return;

    try {
      const response = await fetch(
        `${API_URL}/api/workflows/${activeId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Could not delete workflow.');
      }

      const remaining = await refreshWorkflows();

      if (remaining.length > 0) {
        loadWorkflow(remaining[0]);
      } else {
        setActiveId(null);
        setWorkflowName('Untitled workflow');
        setDescription('');
        setNodes(starterNodes());
        setEdges(starterEdges());
        setDirty(false);
      }

      setNotice('Workflow deleted');
      setError('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to delete workflow.'
      );
    }
  };

  return (
    <main className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-white/10 bg-[#0b101a] p-5 lg:flex lg:flex-col">
        <div className="mb-10 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300">
            <GitBranch size={22} />
          </div>
          <div>
            <div className="font-semibold tracking-wide">AFROMIND</div>
            <div className="text-xs text-cyan-300">AGENTS</div>
          </div>
        </div>

        <div className="mb-3 text-[10px] font-semibold uppercase tracking-[.2em] text-slate-500">
          Workspace
        </div>

        <nav className="space-y-2 text-sm">
          <NavItem icon={<Activity size={17} />} label="Overview" active />
          <NavItem icon={<Bot size={17} />} label="My Agents" />
          <NavItem icon={<WorkflowIcon size={17} />} label="Workflow Builder" />
          <NavItem icon={<Boxes size={17} />} label="Integrations" />
        </nav>

        <div className="mb-3 mt-10 text-[10px] font-semibold uppercase tracking-[.2em] text-slate-500">
          Manage
        </div>

        <nav className="space-y-2 text-sm">
          <NavItem icon={<Zap size={17} />} label="Executions" />
          <NavItem icon={<Settings2 size={17} />} label="Settings" />
          <NavItem icon={<CircleHelp size={17} />} label="Documentation" />
        </nav>

        <div className="mt-auto rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-4">
          <div className="text-xs font-semibold text-cyan-200">
            Build responsibly
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Agents should use scoped tools, clear permissions and human
            approval for sensitive actions.
          </p>
        </div>
      </aside>

      <section className="lg:pl-64">
        <header className="flex h-16 items-center justify-between border-b border-white/10 px-5 md:px-8">
          <div className="text-sm text-slate-400">
            Workspace <span className="mx-2 text-slate-600">/</span>
            <span className="text-white">Workflow Studio</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-500 sm:inline">
              DEVELOPMENT WORKSPACE
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-full border border-cyan-300/30 bg-cyan-300/10 text-xs text-cyan-200">
              AK
            </div>
          </div>
        </header>

        <div className="space-y-6 p-5 md:p-8">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[.22em] text-cyan-300">
                The execution layer
              </div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Workflow Studio
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Design, connect and manage your intelligent workflows.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={createNewWorkflow}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5"
              >
                <Plus size={16} /> New workflow
              </button>

              <button
                onClick={saveWorkflow}
                disabled={saving || loading}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {saving ? 'Saving...' : activeId ? 'Save changes' : 'Save workflow'}
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Saved workflows"
              value={String(workflows.length).padStart(2, '0')}
              note="Stored in database"
              icon={<FolderOpen size={18} />}
            />
            <Metric
              label="Nodes in canvas"
              value={String(nodes.length).padStart(2, '0')}
              note="Current workflow"
              icon={<Bot size={18} />}
            />
            <Metric
              label="Connections"
              value={String(edges.length).padStart(2, '0')}
              note="Current workflow"
              icon={<WorkflowIcon size={18} />}
            />
            <Metric
              label="Workflow status"
              value={dirty ? 'Unsaved' : activeId ? 'Saved' : 'New'}
              note={dirty ? 'Changes not saved' : 'Latest editor state'}
              icon={<Activity size={18} />}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0 space-y-4">
              <div className="rounded-xl border border-white/10 bg-[#0c121e] p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-xs text-slate-400">
                      Workflow name
                    </span>
                    <input
                      value={workflowName}
                      onChange={(event) => {
                        setWorkflowName(event.target.value);
                        setDirty(true);
                      }}
                      placeholder="Enter workflow name"
                      className="w-full rounded-lg border border-white/10 bg-[#080d16] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/50"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs text-slate-400">
                      Description
                    </span>
                    <input
                      value={description}
                      onChange={(event) => {
                        setDescription(event.target.value);
                        setDirty(true);
                      }}
                      placeholder="What does this workflow do?"
                      className="w-full rounded-lg border border-white/10 bg-[#080d16] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/50"
                    />
                  </label>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c121e]">
                <div className="flex flex-col justify-between gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="font-semibold">Workflow canvas</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Drag nodes, connect handles and build your automation.
                    </p>
                  </div>

                  <span className="w-fit rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1 text-[10px] font-medium text-emerald-300">
                    {dirty ? 'UNSAVED CHANGES' : 'EDITOR READY'}
                  </span>
                </div>

                <div className="h-[560px]">
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={(changes) => {
                      onNodesChange(changes);
                      if (changes.some((change) => change.type !== 'select')) {
                        setDirty(true);
                      }
                    }}
                    onEdgesChange={(changes) => {
                      onEdgesChange(changes);
                      if (changes.some((change) => change.type !== 'select')) {
                        setDirty(true);
                      }
                    }}
                    onConnect={onConnect}
                    onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                  >
                    <Background color="#263449" gap={22} size={1} />
                    <Controls />
                    <MiniMap
                      nodeColor="#1e7890"
                      maskColor="rgba(4, 8, 15, 0.7)"
                    />
                  </ReactFlow>
                </div>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-[#0c121e] p-4">
                <h3 className="font-semibold">Node library</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Add building blocks to your workflow.
                </p>

                <label className="mt-4 block">
                  <span className="mb-2 block text-xs text-slate-400">
                    Node type
                  </span>
                  <select
                    value={nodeType}
                    onChange={(event) => setNodeType(event.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#080d16] px-3 py-2.5 text-sm text-white outline-none"
                  >
                    <option value="trigger">Trigger</option>
                    <option value="agent">AI Agent</option>
                    <option value="tool">Tool</option>
                    <option value="condition">Condition</option>
                    <option value="output">Output</option>
                  </select>
                </label>

                <button
                  onClick={addNode}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-3 py-2.5 text-sm font-medium text-cyan-200 hover:bg-cyan-300/15"
                >
                  <Plus size={16} /> Add node
                </button>
              </div>

              <div className="rounded-xl border border-cyan-300/20 bg-[#0c121e] p-4">
                <div className="flex items-center gap-2">
                  <Bot size={17} className="text-cyan-300" />
                  <h3 className="font-semibold">Agent configuration</h3>
                </div>

                {selectedNode?.data.nodeType === "agent" ? (
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {String(selectedNode.data.label || "AI Agent")}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Configure this Agent independently.
                      </p>
                    </div>

                    <label className="block">
                      <span className="mb-2 block text-xs text-slate-400">
                        Instructions
                      </span>
                      <textarea
                        value={selectedAgentConfig.instructions}
                        onChange={(event) =>
                          updateAgentConfig("instructions", event.target.value)
                        }
                        rows={6}
                        placeholder="Describe what this Agent should do..."
                        className="w-full rounded-lg border border-white/10 bg-[#080d16] px-3 py-2.5 text-xs leading-5 text-white outline-none focus:border-cyan-300/50"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs text-slate-400">
                        AI provider
                      </span>
                      <select
                        value={selectedAgentConfig.provider}
                        onChange={(event) =>
                          updateAgentProvider(event.target.value as AIProvider)
                        }
                        className="w-full rounded-lg border border-white/10 bg-[#080d16] px-3 py-2.5 text-xs text-white outline-none"
                      >
                        <option value="groq">Groq</option>
                        <option value="openai">OpenAI</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs text-slate-400">
                        AI model
                      </span>
                      <select
                        value={selectedAgentConfig.model}
                        onChange={(event) =>
                          updateAgentConfig("model", event.target.value)
                        }
                        className="w-full rounded-lg border border-white/10 bg-[#080d16] px-3 py-2.5 text-xs text-white outline-none"
                      >
                        {PROVIDER_MODELS[selectedAgentConfig.provider].map(
                          (model) => (
                            <option key={model.value} value={model.value}>
                              {model.label}
                            </option>
                          )
                        )}
                      </select>
                    </label>

                    <label className="block">
                      <div className="mb-2 flex justify-between">
                        <span className="text-xs text-slate-400">
                          Temperature
                        </span>
                        <span className="text-xs text-cyan-300">
                          {selectedAgentConfig.temperature.toFixed(1)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={selectedAgentConfig.temperature}
                        onChange={(event) =>
                          updateAgentConfig(
                            "temperature",
                            Number(event.target.value)
                          )
                        }
                        className="w-full accent-cyan-300"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs text-slate-400">
                        Maximum output tokens
                      </span>
                      <input
                        type="number"
                        min="100"
                        max="8000"
                        step="100"
                        value={selectedAgentConfig.maxTokens}
                        onChange={(event) =>
                          updateAgentConfig(
                            "maxTokens",
                            Math.min(8000, Math.max(100, Number(event.target.value) || 100))
                          )
                        }
                        className="w-full rounded-lg border border-white/10 bg-[#080d16] px-3 py-2.5 text-xs text-white outline-none focus:border-cyan-300/50"
                      />
                    </label>

                    <p className="rounded-lg border border-cyan-300/10 bg-cyan-300/5 p-3 text-[11px] leading-5 text-slate-400">
                      API credentials are managed securely by the backend.
                      Save your workflow to persist these settings.
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Select an AI Agent on the canvas to configure its
                    instructions, model and execution parameters.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-white/10 bg-[#0c121e] p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Saved workflows</h3>
                  <button
                    onClick={() => refreshWorkflows().catch((err) => setError(err.message))}
                    className="text-slate-400 hover:text-white"
                    title="Refresh workflows"
                  >
                    <RefreshCw size={15} />
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {workflows.length === 0 ? (
                    <p className="rounded-lg bg-white/[0.03] p-3 text-xs text-slate-500">
                      No saved workflows yet. Save your first workflow to see
                      it here.
                    </p>
                  ) : (
                    workflows.map((workflow) => (
                      <button
                        key={workflow.id}
                        onClick={() => loadWorkflow(workflow)}
                        className={`w-full rounded-lg border p-3 text-left transition ${
                          activeId === workflow.id
                            ? 'border-cyan-300/30 bg-cyan-300/10'
                            : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'
                        }`}
                      >
                        <span className="block truncate text-sm font-medium text-slate-200">
                          {workflow.name}
                        </span>
                        <span className="mt-1 block text-[11px] text-slate-500">
                          {workflow.nodes.length} nodes · {workflow.edges.length} connections
                        </span>
                      </button>
                    ))
                  )}
                </div>

                <button
                  onClick={deleteWorkflow}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-red-400/20 px-3 py-2 text-xs text-red-300 hover:bg-red-400/10"
                >
                  <Trash2 size={14} /> Delete current workflow
                </button>
              </div>

              <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/5 p-4">
                <div className="text-xs font-semibold text-cyan-200">
                  Workflow persistence
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Your saved workflows are stored by the Afromind Agents API.
                  Reopen them from this panel whenever you return.
                </p>
              </div>
            </aside>
          </div>

          {(notice || error) && (
            <div
              className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
                error
                  ? 'border-red-400/20 bg-red-400/5 text-red-300'
                  : 'border-emerald-400/20 bg-emerald-400/5 text-emerald-300'
              }`}
            >
              {error ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}
              <span>{error || notice}</span>
              <button
                onClick={() => {
                  setError('');
                  setNotice('');
                }}
                className="ml-auto text-xs opacity-70 hover:opacity-100"
              >
                Dismiss
              </button>
            </div>
          )}

          <p className="text-center text-xs text-slate-600">
            AFROMIND AGENTS · BUILD INTELLIGENTLY. EXECUTE RESPONSIBLY.
          </p>
        </div>
      </section>
    </main>
  );
}

function NavItem({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <a
      href="#"
      onClick={(event) => event.preventDefault()}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
        active
          ? 'bg-cyan-300/10 text-cyan-200'
          : 'text-slate-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      {icon}
      {label}
    </a>
  );
}

function Metric({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0c121e] p-4">
      <div className="flex items-center justify-between text-slate-400">
        <span className="text-xs">{label}</span>
        {icon}
      </div>
      <div className="mt-4 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-[11px] text-slate-500">{note}</div>
    </div>
  );
}
