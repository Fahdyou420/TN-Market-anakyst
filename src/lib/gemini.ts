import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set. AI features will not work.");
}

export const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export async function generateMarketAnalysis(context: string, question: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Tu es un expert analyste financier de la Bourse de Tunis.
            
            Voici les données actuelles du marché (SICAV, FCP, Actions, Obligations et documents CMF) :
            ${context}
            
            Question de l'utilisateur : ${question}
            
            Instructions :
            1. Analyse les mouvements et explique POURQUOI le marché bouge ainsi (basé sur les communiqués CMF et les tendances).
            2. Identifie les chocs de prix (variations anormales quotidiennes, hebdomadaires).
            3. Donne des prédictions précises : prix cible, quand vendre, quand acheter.
            4. Sépare ton analyse par segment : Actions, FCPs/OPCVM, Obligations.
            5. Réponds uniquement en français.
            6. Utilise uniquement les données fournies pour éviter les hallucinations.
            7. Sois professionnel, précis et analytique.`
          }
        ]
      }
    ]
  });

  return response.text;
}

export async function generateDailyReport(marketData: any) {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Génère un rapport quotidien complet sur le marché boursier tunisien basé sur ces données :
            ${JSON.stringify(marketData)}
            
            Le rapport doit inclure :
            1. Résumé Exécutif (État général du marché).
            2. Top/Flop Performeurs (Actions, FCPs, Obligations).
            3. Analyse des Chocs : Quelles valeurs ont subi des mouvements brusques et pourquoi ?
            4. Signaux d'Achat/Vente : Liste des opportunités avec prix d'entrée et de sortie suggérés.
            5. Perspectives : Prédictions pour la prochaine session.
            
            Format : Markdown professionnel en français.`
          }
        ]
      }
    ]
  });

  return response.text;
}
