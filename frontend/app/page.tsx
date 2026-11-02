'use client';

import { useCallback } from "react";
import {
  ReactFlow, Background, Controls, MiniMap, addEdge,
  useEdgesState, useNodesState, type Connection, type Node, type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Activity, Bot, Boxes, CircleHelp, GitBranch, Plus, Settings2, Workflow, Zap } from "lucide-react";

const initialNodes: Node[] = [
  { id: "trigger", position: { x: 80, y: 150 }, data: { label: "Webhook Trigger" }, style: nodeStyle("#123b36") },
  { id: "agent", position: { x: 360, y: 150 }, data: { label: "AI Agent · Lead Qualifier" }, style: nodeStyle("#172d50") },
  { id: "condition", position: { x: 660, y: 150 }, data: { label: "Qualification Check" }, style: nodeStyle("#45351a") },
  { id: "output", position: { x: 960, y: 150 }, data: { label: "Create CRM Lead" }, style: nodeStyle("#34234c") },
];
const initialEdges: Edge[] = [
  { id: "e1", source: "trigger", target: "agent", animated: true },
  { id: "e2", source: "agent", target: "condition", animated: true },
  { id: "e3", source: "condition", target: "output", animated: true },
];
function nodeStyle(background: string) {
  return { background, color: "#f8fafc", border: "1px solid #334155", borderRadius: 12, padding: 16, minWidth: 190, fontSize: 13, fontWeight: 600 };
}

export default function Home() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const onConnect = useCallback((connection: Connection) => setEdges((eds) => addEdge({ ...connection, animated: true }, eds)), [setEdges]);
  const addAgent = () => {
    const id = `agent-${Date.now()}`;
    const newNode: Node = { id, position: { x: 180 + Math.random() * 500, y: 330 + Math.random() * 120 }, data: { label: "New AI Agent" }, style: nodeStyle("#172d50") };
    setNodes((current) => [...current, newNode]);
  };

  return (
    <main className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-white/10 bg-[#0b101a] p-5 lg:flex lg:flex-col">
        <div className="mb-10 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><GitBranch size={22}/></div>
          <div><div className="font-semibold tracking-wide">AFROMIND</div><div className="text-xs text-cyan-300">AGENTS</div></div>
        </div>
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-[.2em] text-slate-500">Workspace</div>
        <nav className="space-y-2 text-sm">
          <NavItem icon={<Activity size={17}/>} label="Overview" active/>
          <NavItem icon={<Bot size={17}/>} label="My Agents"/>
          <NavItem icon={<Workflow size={17}/>} label="Workflow Builder"/>
          <NavItem icon={<Boxes size={17}/>} label="Integrations"/>
        </nav>
        <div className="mb-3 mt-10 text-[10px] font-semibold uppercase tracking-[.2em] text-slate-500">Manage</div>
        <nav className="space-y-2 text-sm">
          <NavItem icon={<Zap size={17}/>} label="Executions"/>
          <NavItem icon={<Settings2 size={17}/>} label="Settings"/>
          <NavItem icon={<CircleHelp size={17}/>} label="Documentation"/>
        </nav>
        <div className="mt-auto rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-4">
          <div className="text-xs font-semibold text-cyan-200">Build responsibly</div>
          <p className="mt-2 text-xs leading-5 text-slate-400">Agents should use scoped tools, clear permissions and human approval for sensitive actions.</p>
        </div>
      </aside>

      <section className="lg:pl-64">
        <header className="flex h-16 items-center justify-between border-b border-white/10 px-5 md:px-8">
          <div className="text-sm text-slate-400">Workspace <span className="mx-2 text-slate-600">/</span><span className="text-white">Overview</span></div>
          <div className="flex items-center gap-3"><span className="hidden text-xs text-slate-500 sm:inline">DEVELOPMENT WORKSPACE</span><div className="grid h-8 w-8 place-items-center rounded-full border border-cyan-300/30 bg-cyan-300/10 text-xs text-cyan-200">AK</div></div>
        </header>

        <div className="space-y-7 p-5 md:p-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div><div className="mb-2 text-xs font-semibold uppercase tracking-[.22em] text-cyan-300">The execution layer</div><h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Command Centre</h1><p className="mt-2 text-sm text-slate-400">Design agents, connect workflows and orchestrate execution.</p></div>
            <button onClick={addAgent} className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"><Plus size={17}/> Add agent node</button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Total agents" value="01" note="Sample workspace" icon={<Bot size={18}/>} />
            <Metric label="Active workflows" value="01" note="Canvas demo" icon={<Workflow size={18}/>} />
            <Metric label="Executions today" value="—" note="Execution engine pending" icon={<Zap size={18}/>} />
            <Metric label="Success rate" value="—" note="No execution data yet" icon={<Activity size={18}/>} />
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c121e]">
            <div className="flex flex-col justify-between gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center">
              <div><h2 className="font-semibold">Workflow canvas</h2><p className="mt-1 text-xs text-slate-500">Demo workflow · drag nodes, connect handles and explore the canvas</p></div>
              <span className="w-fit rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1 text-[10px] font-medium text-emerald-300">INTERACTIVE PREVIEW</span>
            </div>
            <div className="h-[520px]">
              <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView>
                <Background color="#263449" gap={22} size={1}/>
                <Controls/>
                <MiniMap nodeColor="#1e7890" maskColor="rgba(4, 8, 15, 0.7)"/>
              </ReactFlow>
            </div>
          </div>
          <p className="text-center text-xs text-slate-600">AFROMIND AGENTS · BUILD INTELLIGENTLY. EXECUTE RESPONSIBLY.</p>
        </div>
      </section>
    </main>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return <a href="#" className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${active ? "bg-cyan-300/10 text-cyan-200" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>{icon}{label}</a>;
}
function Metric({ label, value, note, icon }: { label: string; value: string; note: string; icon: React.ReactNode }) {
  return <div className="rounded-xl border border-white/10 bg-[#0c121e] p-4"><div className="flex items-center justify-between text-slate-400"><span className="text-xs">{label}</span>{icon}</div><div className="mt-4 text-2xl font-semibold">{value}</div><div className="mt-1 text-[11px] text-slate-500">{note}</div></div>;
}
