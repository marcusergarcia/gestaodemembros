"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  User,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase";
import { Usuario } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  usuario: Usuario | null;
  igrejaId: string | null; // ID da igreja do usuário logado
  loading: boolean;
  isConfigured: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [igrejaId, setIgrejaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If Firebase is not configured, stop loading
    if (!isFirebaseConfigured || !auth || !db) {
      setLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Listen to user document changes
        const userDocRef = doc(db, "usuarios", firebaseUser.uid);
        const unsubscribeUser = onSnapshot(
          userDocRef, 
          (docSnap) => {
            if (docSnap.exists()) {
              const rawData = docSnap.data();
              console.log("[v0] Dados do usuário no Firestore:", rawData);
              const userData = { uid: docSnap.id, ...rawData } as Usuario;
              setUsuario(userData);
              // Suporta tanto igrejaId quanto igrejaID (para compatibilidade com banco)
              const igrejaIdValue = userData.igrejaId || (rawData as { igrejaID?: string }).igrejaID || null;
              console.log("[v0] igrejaId extraído:", igrejaIdValue);
              setIgrejaId(igrejaIdValue);
            } else {
              console.log("[v0] Documento do usuário não existe");
              setUsuario(null);
              setIgrejaId(null);
            }
            setLoading(false);
          },
          () => {
            // Handle permission errors gracefully
            setUsuario(null);
            setLoading(false);
          }
        );

        return () => unsubscribeUser();
      } else {
        setUsuario(null);
        setIgrejaId(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const signOut = async () => {
    if (auth) {
      await firebaseSignOut(auth);
    }
    setUser(null);
    setUsuario(null);
    setIgrejaId(null);
  };

  return (
    <AuthContext.Provider value={{ user, usuario, igrejaId, loading, isConfigured: isFirebaseConfigured, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
