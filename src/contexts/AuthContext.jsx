import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider, ALLOWED_EMAILS } from '../firebase';

const AuthContext = createContext({});

const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Check if email is authorized
    const isEmailAuthorized = (email) => {
        if (!email) return false;
        const cleanEmail = email.trim().toLowerCase();
        const authorized = ALLOWED_EMAILS.map(e => e.trim().toLowerCase()).includes(cleanEmail);
        return authorized;
    };

    // Auth State Listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                if (isEmailAuthorized(user.email)) {
                    setCurrentUser(user);
                    setError(null);
                } else {
                    signOut(auth);
                    setCurrentUser(null);
                    setError(`Access denied. ${user.email} is not authorized.`);
                }
            } else {
                setCurrentUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Sign in with Google (Popup)
    const signInWithGoogle = async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await signInWithPopup(auth, googleProvider);
            if (isEmailAuthorized(result.user.email)) {
                setCurrentUser(result.user);
                return true;
            } else {
                await signOut(auth);
                setError('Access denied. Your email is not authorized.');
                return false;
            }
        } catch (error) {
            setError(error.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Sign out
    const logout = async () => {
        try {
            await signOut(auth);
            setCurrentUser(null);
        } catch (error) {
            setError(error.message);
        }
    };

    const value = {
        currentUser,
        loading,
        error,
        signInWithGoogle,
        logout,
        isEmailAuthorized
    };

return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
export { AuthProvider };
