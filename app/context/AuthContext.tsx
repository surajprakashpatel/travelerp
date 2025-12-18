"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/libs/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

interface AgencyUser {
  uid: string; // This is the Agency ID
  email: string | null;
  agencyName: string;
  ownerName: string;
  plan: string;
}

const AuthContext = createContext<{ user: AgencyUser | null; loading: boolean }>({
  user: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AgencyUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch the Agency Profile directly using the UID
          const docRef = doc(db, "agencies", firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              agencyName: docSnap.data().agencyName,
              ownerName: docSnap.data().ownerName,
              plan: docSnap.data().plan,
            });
          }
        } catch (error) {
          console.error("Error fetching agency profile:", error);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);