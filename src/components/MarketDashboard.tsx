import React, { useState } from "react";
import { TrendingUp, TrendingDown, AlertCircle, RefreshCw, ExternalLink, Newspaper, FileText, Database } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface MarketDashboardProps {
  data: any;
  onRefresh: () => void;
  loading: boolean;
}

export function MarketDashboard({ data, onRefresh, loading }: MarketDashboardProps) {
  const [segment, setSegment] = useState<"STOCK" | "FCP" | "OBLIGATION">("STOCK");
  const allPrices = data?.bvmt_prices || [];
  const prices = allPrices.filter((p: any) => p.segment === segment);
  const signals = data?.signals || [];
  const news = data?.market_news || [];
  const cmfDocs = data?.cmf_docs || [];
  const n8nAnalysis = data?.n8n_analysis || [];

  const topPerformers = [...allPrices]
    .sort((a, b) => parseFloat(b.variation) - parseFloat(a.variation))
    .slice(0, 5);

  const lowPerformers = [...allPrices]
    .sort((a, b) => parseFloat(a.variation) - parseFloat(b.variation))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Tableau de Bord du Marché</h2>
        <div className="flex gap-2">
          <div className="flex bg-slate-100 p-1 rounded-lg mr-4">
            {(["STOCK", "FCP", "OBLIGATION"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSegment(s)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-all",
                  segment === s ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {s === "STOCK" ? "Actions" : s === "FCP" ? "FCPs/OPCVM" : "Obligations"}
              </button>
            ))}
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
          <h3 className="text-sm font-bold text-green-600 uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Top Performeurs
          </h3>
          <div className="space-y-2">
            {topPerformers.map((p, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="font-medium">{p.symbol}</span>
                <span className="text-green-600 font-mono">+{p.variation}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
          <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4" /> Plus Fortes Baisses
          </h3>
          <div className="space-y-2">
            {lowPerformers.map((p, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="font-medium">{p.symbol}</span>
                <span className="text-red-600 font-mono">{p.variation}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Segmented Prices */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-semibold">Liste des {segment === "STOCK" ? "Actions" : segment === "FCP" ? "FCPs" : "Obligations"}</h3>
            <span className="text-xs text-slate-400">{prices.length} éléments</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th className="px-4 py-2">Symbole</th>
                  <th className="px-4 py-2">Prix (TND)</th>
                  <th className="px-4 py-2">Variation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {prices.map((p: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2 font-medium">{p.symbol}</td>
                    <td className="px-4 py-2 font-mono">{p.price.toFixed(3)}</td>
                    <td className={cn(
                      "px-4 py-2 font-medium flex items-center gap-1",
                      p.variation.includes("-") ? "text-red-600" : "text-green-600"
                    )}>
                      {p.variation.includes("-") ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                      {p.variation}
                    </td>
                  </tr>
                ))}
                {prices.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">
                      Aucune donnée pour ce segment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Signals */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-semibold">Signaux de Marché</h3>
          </div>
          <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
            {signals.map((s: any, i: number) => (
              <div key={i} className={cn(
                "p-3 rounded-md border flex gap-3",
                s.type === "BULLISH" ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
              )}>
                <AlertCircle className={cn(
                  "w-5 h-5 shrink-0",
                  s.type === "BULLISH" ? "text-green-600" : "text-red-600"
                )} />
                <div>
                  <p className="text-sm font-semibold">{s.symbol}</p>
                  <p className="text-xs text-slate-600">{s.message}</p>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tighter">
                    {s.strength} • {new Date(s.date).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {signals.length === 0 && (
              <div className="text-center py-8 text-slate-400 italic">
                En attente de signaux...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* News and Bulletins Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market News */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold">Actualités BVMT</h3>
          </div>
          <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
            {news.map((item: any, i: number) => (
              <div key={i} className="group border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider px-1.5 py-0.5 bg-blue-50 rounded mb-1 inline-block">
                      {item.category}
                    </span>
                    <h4 className="text-sm font-medium text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-1">{item.date}</p>
                  </div>
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
            {news.length === 0 && (
              <div className="text-center py-8 text-slate-400 italic">
                Aucune actualité récente.
              </div>
            )}
          </div>
        </div>

        {/* CMF Bulletins & OPCVM */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <FileText className="w-4 h-4 text-orange-600" />
            <h3 className="font-semibold">Bulletins & OPCVM (CMF)</h3>
          </div>
          <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
            {cmfDocs.map((item: any, i: number) => (
              <div key={i} className="group border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider px-1.5 py-0.5 bg-orange-50 rounded mb-1 inline-block">
                      {item.category}
                    </span>
                    <h4 className="text-sm font-medium text-slate-900 leading-tight group-hover:text-orange-600 transition-colors">
                      {item.title.replace(`[${item.category}] `, "")}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-1">{item.date}</p>
                  </div>
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-1.5 text-slate-300 hover:text-orange-600 hover:bg-orange-50 rounded transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
            {cmfDocs.length === 0 && (
              <div className="text-center py-8 text-slate-400 italic">
                Aucun bulletin disponible.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* N8N Analysis Section */}
      {n8nAnalysis.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-blue-50/30 flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold">Analyses Automatisées (N8N)</h3>
            <span className="text-[10px] text-blue-500 font-bold ml-auto">DERNIÈRE SYNC: {data?.last_n8n_sync ? new Date(data.last_n8n_sync).toLocaleTimeString() : "N/A"}</span>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {n8nAnalysis.map((item: any, i: number) => (
              <div key={i} className="p-4 bg-slate-50 border border-slate-100 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                  <Database className="w-12 h-12" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">{item.type}</span>
                  <span className="text-[10px] text-slate-400">{new Date(item.date).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-slate-700 line-clamp-4 leading-relaxed">
                  {item.content}
                </p>
                <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 font-medium">Source: {item.source}</span>
                  <button className="text-[10px] text-blue-600 font-bold hover:underline">Voir détails</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
