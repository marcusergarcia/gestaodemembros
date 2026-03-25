"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { Igreja } from "@/lib/types";
import { useAuth } from "./auth-context";

interface IgrejaContextType {
  igreja: Igreja | null;
  igrejaId: string | null;
  loading: boolean;
  needsOnboarding: boolean; // true se usuário não tem igreja vinculada
}

const IgrejaContext = createContext<IgrejaContextType | undefined>(undefined);

export function IgrejaProvider({ children }: { children: ReactNode }) {
  const { usuario, loading: authLoading } = useAuth();
  const [igreja, setIgreja] = useState<Igreja | null>(null);
  const [loading, setLoading] = useState(true);

  const igrejaId = usuario?.igrejaId || null;
  const needsOnboarding = !authLoading && usuario !== null && !igrejaId;

  useEffect(() => {
    // Se Firebase não está configurado ou auth ainda está carregando
    if (!isFirebaseConfigured || !db || authLoading) {
      setLoading(false);
      return;
    }

    // Se usuário não está logado ou não tem igreja
    if (!usuario || !igrejaId) {
      setIgreja(null);
      setLoading(false);
      return;
    }

    // Escuta mudanças no documento da igreja
    const igrejaDocRef = doc(db, "igrejas", igrejaId);
    const unsubscribe = onSnapshot(
      igrejaDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setIgreja({ id: docSnap.id, ...docSnap.data() } as Igreja);
        } else {
          setIgreja(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao carregar igreja:", error);
        setIgreja(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [usuario, igrejaId, authLoading]);

  return (
    <IgrejaContext.Provider value={{ igreja, igrejaId, loading, needsOnboarding }}>
      {children}
    </IgrejaContext.Provider>
  );
}

export function useIgreja() {
  const context = useContext(IgrejaContext);
  if (context === undefined) {
    throw new Error("useIgreja must be used within an IgrejaProvider");
  }
  return context;
}
