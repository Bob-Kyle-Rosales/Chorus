"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgentState } from "@/types/events";

const ROLE_STYLES: Record<string, string> = {
  planner: "bg-white/20 text-white border-white-500/20",
  researcher: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  critic: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  synthesizer: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const STATUS_STYLES: Record<string, string> = {
  running:
    "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 animate-pulse",
  finished: "bg-green-500/10 text-green-400 border-green-500/20",
};

export function AgentCard({ agent }: { agent: AgentState }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-mono text-white/70">
            {agent.agent_id}
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className={ROLE_STYLES[agent.role]}>
              {agent.role}
            </Badge>
            <Badge variant="outline" className={STATUS_STYLES[agent.status]}>
              {agent.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="text-xs text-white/60 whitespace-pre-wrap font-mono leading-relaxed max-h-40 overflow-y-auto">
            {agent.tokens ||
              (agent.status === "finished" ? "Done." : "Waiting...")}
          </pre>
        </CardContent>
      </Card>
    </motion.div>
  );
}
