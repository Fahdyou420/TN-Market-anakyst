import React, { useState } from "react";
import { FileText, Download, Loader2, CheckCircle } from "lucide-react";
import { generateDailyReport } from "@/src/lib/gemini";

interface ReportGeneratorProps {
  marketData: any;
}

export function ReportGenerator({ marketData }: ReportGeneratorProps) {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateDailyReport(marketData);
      setReport(result || "Erreur lors de la génération.");
    } catch (error) {
      console.error("Report error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold">Rapports Quotidiens</h3>
        </div>
        {!report && (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
            Générer le rapport du jour
          </button>
        )}
      </div>

      <div className="p-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            <p className="text-slate-500 animate-pulse">L'IA analyse les données et rédige le rapport...</p>
          </div>
        )}

        {!loading && !report && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h4 className="text-lg font-medium text-slate-900">Aucun rapport généré</h4>
            <p className="text-slate-500 max-w-xs mx-auto mt-2">
              Cliquez sur le bouton ci-dessus pour générer une analyse complète du marché en français.
            </p>
          </div>
        )}

        {report && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-100 rounded-md">
              <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
                <CheckCircle className="w-4 h-4" />
                Rapport généré avec succès
              </div>
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:underline font-medium"
              >
                <Download className="w-3 h-3" />
                Télécharger PDF
              </button>
            </div>
            <div className="prose prose-slate max-w-none p-4 border border-slate-100 rounded-md bg-slate-50/50 max-h-[500px] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
              {report}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
