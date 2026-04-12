import React, { useState, useEffect } from "react";
import { LayoutDashboard, MessageSquare, FileText, Settings, Globe, ShieldCheck, Database, LogIn, LogOut, User as UserIcon, Briefcase } from "lucide-react";
import { MarketDashboard } from "./components/MarketDashboard";
import { ChatInterface } from "./components/ChatInterface";
import { ReportGenerator } from "./components/ReportGenerator";
import { PortfolioTracker } from "./components/PortfolioTracker";
import { cn } from "@/src/lib/utils";
import axios from "axios";
import { useAuth } from "./lib/AuthContext";

type Tab = "dashboard" | "chat" | "reports" | "portfolio" | "settings";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [marketData, setMarketData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading, isAdmin, login, logout } = useAuth();

  const fetchMarketData = async () => {
    setLoading(true);
    try {
      // Trigger scraping - these now return 200 even on failure
      const bvmtRes = await axios.post("/api/scrape/bvmt");
      const cmfRes = await axios.post("/api/scrape/cmf");
      const newsRes = await axios.post("/api/scrape/news");
      
      if (bvmtRes.data.status === "error") {
        console.warn("BVMT Scrape Error:", bvmtRes.data.message);
      }
      if (cmfRes.data.status === "error") {
        console.warn("CMF Scrape Error:", cmfRes.data.message);
      }
      if (newsRes.data.status === "error") {
        console.warn("News Scrape Error:", newsRes.data.message);
      }
      
      // Then fetch the summary
      const response = await axios.get("/api/market/summary");
      setMarketData(response.data);
    } catch (error) {
      console.error("Error fetching market data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMarketData();
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Chargement de votre session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200">
              <Globe className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Tunisian Market Advisor AI</h1>
            <p className="text-slate-500 mb-8">Connectez-vous pour accéder aux analyses exclusives du marché boursier tunisien.</p>
            
            <button
              onClick={login}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
              Se connecter avec Google
            </button>
          </div>
          <div className="bg-slate-50 px-8 py-4 border-t border-slate-100">
            <p className="text-xs text-center text-slate-400">
              Accès réservé aux analystes et investisseurs autorisés.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "chat", label: "Conseiller IA", icon: MessageSquare },
    { id: "reports", label: "Rapports", icon: FileText },
    { id: "portfolio", label: "Portefeuille", icon: Briefcase },
    { id: "settings", label: "Configuration", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 z-20 hidden md:flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">Tunisian Market</h1>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold tracking-widest">Advisor AI (Local)</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                activeTab === item.id 
                  ? "bg-blue-50 text-blue-600 shadow-sm" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ""} referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{user.displayName || "Utilisateur"}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
            </div>
            <button 
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3" />
              Status Système
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Postgres (Local)</span>
              <span className="flex items-center gap-1 text-green-600 font-medium">
                <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse" />
                Connecté
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Firebase Auth</span>
              <span className="flex items-center gap-1 text-green-600 font-medium">
                <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse" />
                Actif
              </span>
            </div>
            {isAdmin && (
              <div className="mt-2 pt-2 border-t border-slate-200">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">Admin</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 p-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              {navItems.find(n => n.id === activeTab)?.label}
            </h2>
            <p className="text-slate-500 mt-1">
              Bienvenue sur votre plateforme d'analyse du marché tunisien.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-600 shadow-sm">
              <Database className="w-3 h-3 text-blue-500" />
              Mode Local Actif
            </div>
          </div>
        </header>

        <div className="max-w-6xl">
          {activeTab === "dashboard" && (
            <MarketDashboard 
              data={marketData} 
              onRefresh={fetchMarketData} 
              loading={loading} 
            />
          )}
          {activeTab === "chat" && (
            <ChatInterface marketData={marketData} />
          )}
          {activeTab === "reports" && (
            <ReportGenerator marketData={marketData} />
          )}
          {activeTab === "portfolio" && (
            <PortfolioTracker marketPrices={marketData?.bvmt_prices || []} />
          )}
          {activeTab === "settings" && (
            <div className="bg-white p-8 border border-slate-200 rounded-lg shadow-sm">
              <h3 className="text-xl font-bold mb-4">Configuration du Système</h3>
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <div className="flex items-center gap-2 text-blue-700 font-bold text-sm mb-2">
                    <Database className="w-4 h-4" />
                    Intégration N8N & Automatisation
                  </div>
                  <p className="text-xs text-blue-600 mb-4">
                    Utilisez ces endpoints dans vos workflows N8N pour automatiser le scraping quotidien et l'analyse IA.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Scraping Quotidien (POST)</p>
                      <code className="block p-2 bg-white border border-blue-200 rounded text-[10px] text-slate-700 break-all">
                        {window.location.origin}/api/scrape/news
                      </code>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Push Analyse N8N (POST)</p>
                      <code className="block p-2 bg-white border border-blue-200 rounded text-[10px] text-slate-700 break-all">
                        {window.location.origin}/api/n8n/analysis
                      </code>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm text-slate-700 mb-2">Sources de Données</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border border-slate-100 rounded-md">
                      <span className="text-sm">BVMT (Bourse de Tunis)</span>
                      <span className="text-xs text-green-600 font-medium">Actif</span>
                    </div>
                    <div className="flex items-center justify-between p-3 border border-slate-100 rounded-md">
                      <span className="text-sm">CMF (Conseil du Marché Financier)</span>
                      <span className="text-xs text-green-600 font-medium">Actif</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-700 mb-2">Modèle d'IA</h4>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-md flex items-center justify-between">
                    <span className="text-sm font-mono">gemini-3.1-pro-preview</span>
                    <span className="text-xs text-blue-600 font-medium">Optimisé pour RAG</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-400">
                    Ce système est conçu pour fonctionner localement via Docker. Les données sont stockées dans Postgres et les embeddings dans Qdrant.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
