import { MessagePart, DatabaseResult } from "@/components/ChatInterface";

export interface NormalisedToolResult {
  spec?: Record<string, unknown>;
  db?: DatabaseResult;
  cdnUrl?: string;
}

export function getToolResult(part: MessagePart): NormalisedToolResult | null {
  if (part.toolInvocation?.state === "result") {
    if (part.toolInvocation?.toolName === "render_chart") {
      return { spec: part.toolInvocation.result.spec };
    }
    if (part.toolInvocation?.toolName === "db") {
      return { db: part.toolInvocation.args.db };
    }
    if (part.toolInvocation?.toolName === "view_image") {
      return { cdnUrl: part.toolInvocation.result.cdnUrl };
    }
  }

  return null;
}
