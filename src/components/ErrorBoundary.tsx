import React, { useState, useEffect, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

export function ErrorBoundary({ children }: Props) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setHasError(true);
      setError(event.error);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    let errorMessage = "Une erreur inattendue est survenue.";
    
    try {
      if (error?.message) {
        const parsed = JSON.parse(error.message);
        if (parsed.error?.includes("permission")) {
          errorMessage = "Erreur de permission : Vous n'avez pas les droits nécessaires pour cette opération.";
        }
      }
    } catch {
      // Not a JSON error
    }

    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-red-50 rounded-xl border border-red-100 m-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-red-900 mb-2">Oups ! Quelque chose s'est mal passé</h2>
        <p className="text-red-700 mb-6 max-w-md">{errorMessage}</p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          <RefreshCcw className="w-4 h-4" />
          Recharger l'application
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
