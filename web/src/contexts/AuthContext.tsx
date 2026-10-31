import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, signInWithRedirect, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db, googleProvider } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { User, Household } from '../models';

interface AuthContextType {
    user: FirebaseUser | null;
    appUser: User | null;
    household: Household | null;
    partnerUser: User | null;
    loading: boolean;
    signIn: () => Promise<void>;
    logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null, appUser: null, household: null, partnerUser: null, loading: true,
    signIn: async () => {}, logOut: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [appUser, setAppUser] = useState<User | null>(null);
    const [household, setHousehold] = useState<Household | null>(null);
    const [partnerUser, setPartnerUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                const userRef = doc(db, 'users', firebaseUser.uid);
                const unsubUser = onSnapshot(userRef, async (docSnap) => {
                    if (docSnap.exists()) {
                        const userData = docSnap.data() as User;
                        setAppUser(userData);
                    } else {
                        const newUser: User = {
                            id: firebaseUser.uid,
                            name: firebaseUser.displayName || 'Unknown',
                            email: firebaseUser.email || '',
                            householdId: null,
                            connectedAt: null,
                            createdAt: Date.now()
                        };
                        await setDoc(userRef, newUser);
                        setAppUser(newUser);
                    }
                }, (error) => {
                    console.error("Error listening to user:", error);
                });
                return () => unsubUser();
            } else {
                setAppUser(null);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (appUser && appUser.householdId) {
            const hRef = doc(db, 'households', appUser.householdId);
            const unsubH = onSnapshot(hRef, async (snap) => {
                if (snap.exists()) {
                    const hData = snap.data() as Household;
                    setHousehold(hData);
                    
                    const partnerId = hData.members.find(m => m !== appUser.id);
                    if (partnerId) {
                        try {
                            const pSnap = await getDoc(doc(db, 'users', partnerId));
                            if (pSnap.exists()) {
                                setPartnerUser(pSnap.data() as User);
                            } else {
                                setPartnerUser({ id: partnerId, name: 'Partner', email: '', householdId: hData.id, connectedAt: null, createdAt: 0 });
                            }
                        } catch (e) {
                            console.log("Permission denied or error getting partner", e);
                            setPartnerUser({ id: partnerId, name: 'Partner', email: '', householdId: hData.id, connectedAt: null, createdAt: 0 });
                        }
                    } else {
                        setPartnerUser(null);
                    }
                } else {
                    setHousehold(null);
                    setPartnerUser(null);
                }
                setLoading(false);
            }, (error) => {
                 console.error("Error listening to household:", error);
                 setLoading(false);
            });
            return () => unsubH();
        } else if (appUser) {
            setHousehold(null);
            setPartnerUser(null);
            setLoading(false);
        }
    }, [appUser?.householdId]);

    // redirect-based sign-in: required for iOS (WKWebView shells), works everywhere
    const signIn = async () => {
        await signInWithRedirect(auth, googleProvider);
    };

    const logOut = async () => {
        await signOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, appUser, household, partnerUser, loading, signIn, logOut }}>
            {children}
        </AuthContext.Provider>
    );
};
