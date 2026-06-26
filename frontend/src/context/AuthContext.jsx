import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const AuthContext = createContext();

// The `useAuth` hook is intentionally colocated with its provider. This trips
// react-refresh/only-export-components (a fast-refresh DX hint, not a bug);
// disabled here rather than splitting the tiny context across two files.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

// Auth/routing is **session-driven**: `allowUser` mirrors the Firebase Auth
// session via onAuthStateChanged. (Previously this read a custom token from
// localStorage with a 15-minute self-destruct timer, which desynced from the
// real Firebase session — see ROADMAP P0 #2 / P1. The backend `/api/signin`
// custom-token round-trip was dead weight and has been removed from the client.)
//
// `allowUser` is `undefined` until the first auth callback resolves, so routers
// can show a loading state instead of flashing the login screen.
export const AuthProvider = ({ children }) => {
  const [allowUser, setAllowUser] = useState(undefined);
  const [display, setDisplay] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAllowUser(!!user);
    });
    return () => unsub();
  }, []);

  const value = {
    allowUser,
    setAllowUser,
    setDisplay,
    display,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
