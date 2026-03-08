import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, User, Sparkles, X, Maximize2, Minimize2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTED_QUESTIONS = [
  "What is my biggest security risk?",
  "How secure is my cloud environment?",
  "What should I fix first?",
  "Explain my compliance status",
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/security-copilot`;

interface SecurityCopilotProps {
  context?: Record<string, unknown>;
}

export function SecurityCopilot({ context }: SecurityCopilotProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const streamChat = async (allMessages: Msg[]) => {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: allMessages, context }),
    });

    if (resp.status === 429) { toast.error("Rate limit exceeded."); throw new Error("rate_limited"); }
    if (resp.status === 402) { toast.error("AI credits exhausted."); throw new Error("payment_required"); }
    if (!resp.ok || !resp.body) throw new Error("Failed to start stream");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantSoFar = "";

    const updateAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      const current = assistantSoFar;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: current } : m);
        }
        return [...prev, { role: "assistant", content: current }];
      });
    };

    let streamDone = false;
    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });
      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") { streamDone = true; break; }
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) updateAssistant(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }
  };

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    try {
      await streamChat([...messages, userMsg]);
    } catch (e) {
      if ((e as Error).message !== "rate_limited" && (e as Error).message !== "payment_required") {
        toast.error("Failed to get response.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-2xl shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 transition-all hover:scale-105 group"
        size="icon"
      >
        <div className="relative">
          <Bot className="h-6 w-6 transition-transform group-hover:scale-110" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-primary animate-pulse" />
        </div>
      </Button>
    );
  }

  return (
    <Card className={cn(
      "fixed z-50 shadow-2xl border-border/50 transition-all duration-300 overflow-hidden",
      isExpanded
        ? "inset-4 rounded-2xl"
        : "bottom-6 right-6 w-[400px] h-[560px] rounded-2xl"
    )}>
      <CardHeader className="pb-3 flex flex-row items-center justify-between border-b bg-muted/30">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-info flex items-center justify-center shadow-sm">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">Security Copilot</CardTitle>
            <p className="text-[11px] text-muted-foreground">AI-powered security advisor</p>
          </div>
        </div>
        <div className="flex gap-0.5">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col p-0" style={{ height: "calc(100% - 73px)" }}>
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="text-center py-8">
                <div className="h-14 w-14 mx-auto rounded-2xl bg-gradient-to-br from-primary/10 to-info/10 flex items-center justify-center mb-3">
                  <Bot className="h-7 w-7 text-primary" />
                </div>
                <p className="text-sm font-semibold">Hi! I'm your Security Copilot</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ask me anything about your cloud security
                </p>
              </div>
              <div className="space-y-2">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <Button
                    key={q}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs h-auto py-2.5 px-3 rounded-xl hover:bg-primary/5 hover:border-primary/20 transition-all animate-fade-in-up"
                    style={{ animationDelay: `${i * 0.05}s` }}
                    onClick={() => send(q)}
                  >
                    <Sparkles className="h-3 w-3 mr-2 shrink-0 text-primary" />
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex gap-2 animate-slide-up-fade", msg.role === "user" ? "justify-end" : "")}>
                  {msg.role === "assistant" && (
                    <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-primary/10 to-info/10 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                  )}
                  <div className={cn(
                    "rounded-xl px-3 py-2 max-w-[85%] text-sm",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted rounded-bl-sm"
                  )}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.role === "user" && (
                    <div className="h-6 w-6 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-1">
                      <User className="h-3 w-3" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-2">
                  <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-primary/10 to-info/10 flex items-center justify-center shrink-0">
                    <Bot className="h-3 w-3 text-primary animate-pulse" />
                  </div>
                  <div className="bg-muted rounded-xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
        <div className="p-3 border-t bg-muted/20">
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your security..."
              className="text-sm rounded-xl"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isLoading} className="rounded-xl shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}