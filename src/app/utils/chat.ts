import { MessagePart, DatabaseResult } from "@/components/ChatInterface";

export interface NormalisedToolResult {
    spec?: Record<string, unknown>;
    db?: DatabaseResult;
  }
  
  export function getToolResult(part: MessagePart): NormalisedToolResult | null {
    if (part.toolInvocation?.toolName === "render_chart") {
      if (part.toolInvocation.state === "result") {
        console.log("response from model", part.toolInvocation.result.spec);
        return { spec: part.toolInvocation.result.spec };
      }
    }
    if (part.toolInvocation?.toolName === "db") {
        return { db: part.toolInvocation.args.db };
    }
    
    return null;
  }
  