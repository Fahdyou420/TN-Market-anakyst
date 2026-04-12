import React, { useState, useEffect } from "react";
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet, Briefcase } from "lucide-react";
import { db, auth } from "../lib/firebase";
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { cn } from "../lib/utils";

interface PortfolioItem {
  id: string;
  symbol: string;
  quantity: number;
  buyPrice: number;
  buyDate: string;
  segment: string;
}

interface PortfolioTrackerProps {
  marketPrices: any[];
}

export function PortfolioTracker({ marketPrices }: PortfolioTrackerProps) {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newPrice, setNewPrice] = useState("");

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(collection(db, "portfolio"), where("uid", "==", auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const portfolioItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PortfolioItem[];
      setItems(portfolioItems);
    });

    return () => unsubscribe();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newSymbol || !newQty || !newPrice) return;

    try {
      await addDoc(collection(db, "portfolio"), {
        uid: auth.currentUser.uid,
        symbol: newSymbol.toUpperCase(),
        quantity: parseFloat(newQty),
        buyPrice: parseFloat(newPrice),
        buyDate: new Date().toISOString(),
        segment: "STOCK" // Default
      });
      setNewSymbol("");
      setNewQty("");
      setNewPrice("");
      setIsAdding(false);
    } catch (error) {
      console.error("Error adding to portfolio:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "portfolio", id));
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const calculateStats = () => {
    let totalInvested = 0;
    let currentValue = 0;

    items.forEach(item => {
      const marketPrice = marketPrices.find(p => p.symbol === item.symbol)?.price || item.buyPrice;
      totalInvested += item.quantity * item.buyPrice;
      currentValue += item.quantity * marketPrice;
    });

    const profitLoss = currentValue - totalInvested;
    const profitLossPct = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

    return { totalInvested, currentValue, profitLoss, profitLossPct };
  };

  const stats = calculateStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Mon Portefeuille</h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Ajouter un actif
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Wallet className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Investissement Total</span>
          </div>
          <p className="text-2xl font-bold">{stats.totalInvested.toLocaleString()} TND</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Briefcase className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Valeur Actuelle</span>
          </div>
          <p className="text-2xl font-bold">{stats.currentValue.toLocaleString()} TND</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            {stats.profitLoss >= 0 ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
            <span className="text-xs font-medium uppercase">Plus/Moins-Value</span>
          </div>
          <p className={cn(
            "text-2xl font-bold",
            stats.profitLoss >= 0 ? "text-green-600" : "text-red-600"
          )}>
            {stats.profitLoss.toLocaleString()} TND ({stats.profitLossPct.toFixed(2)}%)
          </p>
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Symbole (ex: BIAT)"
            className="px-3 py-2 border rounded-md text-sm"
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            required
          />
          <input
            type="number"
            step="0.001"
            placeholder="Quantité"
            className="px-3 py-2 border rounded-md text-sm"
            value={newQty}
            onChange={(e) => setNewQty(e.target.value)}
            required
          />
          <input
            type="number"
            step="0.001"
            placeholder="Prix d'achat"
            className="px-3 py-2 border rounded-md text-sm"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            required
          />
          <button type="submit" className="bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
            Confirmer
          </button>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50">
            <tr>
              <th className="px-4 py-3">Actif</th>
              <th className="px-4 py-3">Quantité</th>
              <th className="px-4 py-3">P.A.M</th>
              <th className="px-4 py-3">Cours Actuel</th>
              <th className="px-4 py-3">Performance</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => {
              const currentPrice = marketPrices.find(p => p.symbol === item.symbol)?.price || item.buyPrice;
              const perf = ((currentPrice - item.buyPrice) / item.buyPrice) * 100;
              
              return (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{item.symbol}</td>
                  <td className="px-4 py-3">{item.quantity}</td>
                  <td className="px-4 py-3 font-mono">{item.buyPrice.toFixed(3)}</td>
                  <td className="px-4 py-3 font-mono">{currentPrice.toFixed(3)}</td>
                  <td className={cn(
                    "px-4 py-3 font-medium",
                    perf >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {perf >= 0 ? "+" : ""}{perf.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                  Votre portefeuille est vide.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
