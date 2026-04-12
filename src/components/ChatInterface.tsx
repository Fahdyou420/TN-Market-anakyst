import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Paperclip, FileText, X } from "lucide-react";
import axios from "axios";
import { cn } from "@/src/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  file?: {
    name: string;
    analysis?: string;
  };
}

interface ChatInterfaceProps {
  marketData: any;
}

export function ChatInterface({ marketData }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Bonjour ! Je suis votre analyste financier IA. Comment puis-je vous aider aujourd'hui ? Vous pouvez me poser des questions sur le marché ou me transmettre des documents (PDF, images) pour analyse.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedFile) || loading) return;

    const userMessage: Message = { role: "user", content: input };
    if (selectedFile) {
      userMessage.file = { name: selectedFile.name };
    }
    
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      let analysisResult = "";
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("prompt", input || "Analyse ce document pour le marché tunisien.");
        
        const res = await axios.post("/api/analyze-doc", formData);
        analysisResult = res.data.analysis;
        setSelectedFile(null);
      }

      const context = JSON.stringify({
        prices: marketData?.bvmt_prices?.slice(0, 20),
        signals: marketData?.signals?.slice(0, 10),
        docs: marketData?.cmf_docs?.slice(0, 5)
      });

      const response = await axios.post("/api/ai/chat", {
        prompt: input || "Analyse du document joint",
        context: context + (analysisResult ? `\n\nAnalyse du document: ${analysisResult}` : ""),
        useOpenRouter: false // Can be toggled in settings
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.data.text },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Désolé, une erreur est survenue lors de l'analyse." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
        <Bot className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold">Conseiller IA (RAG & Analyse Doc)</h3>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-3 max-w-[85%]",
              m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
              m.role === "user" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
            )}>
              {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className="space-y-2">
              <div className={cn(
                "p-3 rounded-2xl text-sm",
                m.role === "user" 
                  ? "bg-blue-600 text-white rounded-tr-none" 
                  : "bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm"
              )}>
                {m.content}
              </div>
              {m.file && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
                  <FileText className="w-3 h-3" />
                  <span className="font-medium">{m.file.name}</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 mr-auto">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            </div>
            <div className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 text-sm italic">
              L'IA analyse les données...
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-100 bg-white">
        {selectedFile && (
          <div className="mb-3 flex items-center justify-between p-2 bg-blue-50 border border-blue-100 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-blue-700">
              <FileText className="w-3 h-3" />
              <span className="font-medium">{selectedFile.name}</span>
            </div>
            <button onClick={() => setSelectedFile(null)} className="text-blue-400 hover:text-blue-600">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
            title="Joindre un document"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez votre question ou joignez un document..."
            className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          <button
            type="submit"
            disabled={loading || (!input.trim() && !selectedFile)}
            className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-600/20"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
