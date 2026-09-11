'use client';

/**
 * Firebase Auth Hydrated Session & Auth Store for Murphy's Web App.
 * Automatically synchronizes with Firebase Auth and Firestore `/users/{uid}`.
 */

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { auth, db, googleAuthProvider } from './firebaseConfig';
import { AccountType, normalizeAccountType } from '@/rbac/accountTypes';
import { DispatchGroupCategory, normalizeDispatchGroupCategory } from '@/rbac/dispatchGroups';
import { UserPermissions, getDefaultPermissions } from '@/rbac/permissions';
import { CANONICAL_OFFICIAL_USERS } from '@/domain/mock';
import { cleanUserDisplayName } from '@/domain';

export interface UserSession {
  id: string;
  uid: string;
  name: string;
  email: string;
  accountType: AccountType;
  dispatchGroup: DispatchGroupCategory;
  permissions: UserPermissions;
  token?: string;
  isSandboxOverride?: boolean;
}

export interface SessionContextType {
  currentUser: UserSession | null;
  firebaseUser: FirebaseUser | null;
  permissions: UserPermissions;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSandboxOverride: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchRole: (accountType: AccountType, dispatchGroup: DispatchGroupCategory) => void;
  resetSandboxOverride: () => void;
  hasPermission: (permission: keyof UserPermissions) => boolean;
}

const DEV_SANDBOX_STORAGE_KEY = 'fsm_demo_dev_sandbox_session';
const PORTAL_CACHED_SESSION_KEY = 'fsm_portal_cached_session';
export const EXPLICIT_SIGN_OUT_KEY = 'fsm_explicit_sign_out';
const defaultOfficePermissions = getDefaultPermissions('office', 'office_staff');

export function getDefaultDemoSession(): UserSession {
  return {
    id: 'demo-admin-uid',
    uid: 'demo-admin-uid',
    name: 'Alex Reynolds',
    email: 'admin@apex.com',
    accountType: 'admin',
    dispatchGroup: 'office_staff',
    permissions: getDefaultPermissions('admin', 'office_staff'),
    isSandboxOverride: false,
  };
}

function getInitialCachedSession(): { session: UserSession | null; isSandbox: boolean } {
  if (typeof window === 'undefined') {
    return { session: getDefaultDemoSession(), isSandbox: false };
  }
  try {
    const hasExplicitlySignedOut = localStorage.getItem(EXPLICIT_SIGN_OUT_KEY) === 'true';
    if (hasExplicitlySignedOut) {
      return { session: null, isSandbox: false };
    }

    const savedDevSession = localStorage.getItem(DEV_SANDBOX_STORAGE_KEY);
    if (savedDevSession) {
      const parsed = JSON.parse(savedDevSession) as UserSession;
      if (parsed && parsed.accountType) {
        const cleanName = cleanUserDisplayName(parsed.name);
        return {
          session: {
            ...parsed,
            name: cleanName,
            permissions: getDefaultPermissions(parsed.accountType, parsed.dispatchGroup),
            isSandboxOverride: true,
          },
          isSandbox: true,
        };
      }
    }

    const cached = localStorage.getItem(PORTAL_CACHED_SESSION_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as UserSession;
      if (parsed && parsed.accountType) {
        return {
          session: {
            ...parsed,
            name: cleanUserDisplayName(parsed.name),
            permissions: getDefaultPermissions(parsed.accountType, parsed.dispatchGroup),
            isSandboxOverride: false,
          },
          isSandbox: false,
        };
      }
    }

    // Default to the Demo Admin session for seamless demo viewing
    return { session: getDefaultDemoSession(), isSandbox: false };
  } catch (e) {
    console.warn('Failed to load cached session:', e);
  }
  return { session: getDefaultDemoSession(), isSandbox: false };
}

function persistCachedSession(session: UserSession | null) {
  if (typeof window === 'undefined') return;
  try {
    if (session) {
      localStorage.setItem(PORTAL_CACHED_SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(PORTAL_CACHED_SESSION_KEY);
    }
  } catch (e) {}
}

function buildUserSession(userId: string, user: FirebaseUser | null, data: any): UserSession {
  const actualId = data?.id || userId;
  const userEmail = (user?.email || data?.email || '').toLowerCase().trim();
  const isAdminEmail = userEmail === 'admin@apex.com' || userEmail.startsWith('admin@');

  if (data) {
    const rawAccountType =
      isAdminEmail
        ? 'admin'
        : (data.accountType ||
           data.role ||
           data.permissions?.accountType ||
           (typeof data.permissions === 'string' ? data.permissions : undefined));
    const accountType = normalizeAccountType(rawAccountType);
    const dispatchGroup = normalizeDispatchGroupCategory(
      Array.isArray(data.dispatchGroups) ? data.dispatchGroups[0] : (data.dispatchGroup || (accountType === 'admin' ? 'office_staff' : 'office_staff'))
    );
    const defaultPerms = getDefaultPermissions(accountType, dispatchGroup);
    const rawPerms = typeof data.permissions === 'object' && data.permissions !== null ? data.permissions : {};
    const permissions: UserPermissions = {
      ...defaultPerms,
      ...rawPerms,
      accountType,
      hasWebPortalAccess: accountType === 'admin' || accountType === 'office',
      reportingTabVisibility: accountType === 'admin' ? true : (rawPerms.reportingTabVisibility !== undefined ? Boolean(rawPerms.reportingTabVisibility) : defaultPerms.reportingTabVisibility),
      moreAppsAndSettingsVisibility: accountType === 'admin' ? true : (rawPerms.moreAppsAndSettingsVisibility !== undefined ? Boolean(rawPerms.moreAppsAndSettingsVisibility) : defaultPerms.moreAppsAndSettingsVisibility),
      appointmentVisibility: rawPerms.appointmentVisibility || defaultPerms.appointmentVisibility,
      allCustomerVisibility: rawPerms.allCustomerVisibility !== undefined ? Boolean(rawPerms.allCustomerVisibility) : defaultPerms.allCustomerVisibility,
      scheduleEventsPermission: rawPerms.scheduleEventsPermission || defaultPerms.scheduleEventsPermission,
      manuallyEnterCards: rawPerms.manuallyEnterCards !== undefined ? Boolean(rawPerms.manuallyEnterCards) : defaultPerms.manuallyEnterCards,
      manageRecurringPayments: rawPerms.manageRecurringPayments !== undefined ? Boolean(rawPerms.manageRecurringPayments) : defaultPerms.manageRecurringPayments,
      performCreditsAndVoids: rawPerms.performCreditsAndVoids !== undefined ? Boolean(rawPerms.performCreditsAndVoids) : defaultPerms.performCreditsAndVoids,
      performFinancingActions: rawPerms.performFinancingActions !== undefined ? Boolean(rawPerms.performFinancingActions) : defaultPerms.performFinancingActions,
      receiptCopyRecipients: Array.isArray(rawPerms.receiptCopyRecipients) ? rawPerms.receiptCopyRecipients : defaultPerms.receiptCopyRecipients,
      editPricesAndTaxOnMobile: rawPerms.editPricesAndTaxOnMobile !== undefined ? Boolean(rawPerms.editPricesAndTaxOnMobile) : defaultPerms.editPricesAndTaxOnMobile,
      createCustomLineItems: rawPerms.createCustomLineItems !== undefined ? Boolean(rawPerms.createCustomLineItems) : defaultPerms.createCustomLineItems,
      viewJobPnL: rawPerms.viewJobPnL !== undefined ? Boolean(rawPerms.viewJobPnL) : defaultPerms.viewJobPnL,
    };

    const resolvedName = cleanUserDisplayName(data.displayName || data.name || (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : '') || user?.displayName || (isAdminEmail ? 'Alex Reynolds' : 'Demo Staff'));

    return {
      id: actualId,
      uid: user?.uid || actualId,
      name: resolvedName,
      email: user?.email || data.email || '',
      accountType,
      dispatchGroup,
      permissions,
      isSandboxOverride: false,
    };
  } else {
    // Check if canonical mock matches by email
    const canonicalMatch = userEmail ? CANONICAL_OFFICIAL_USERS.find((u) => (u.email || '').toLowerCase().trim() === userEmail) : null;
    if (canonicalMatch) {
      return buildUserSession(canonicalMatch.id, user, canonicalMatch);
    }

    const fallbackAccountType: AccountType = isAdminEmail ? 'admin' : 'office';
    const fallbackGroup: DispatchGroupCategory = 'office_staff';
    return {
      id: user?.uid || actualId,
      uid: user?.uid || actualId,
      name: cleanUserDisplayName(user?.displayName || (isAdminEmail ? 'Alex Reynolds' : 'Demo Staff')),
      email: user?.email || (isAdminEmail ? 'admin@apex.com' : ''),
      accountType: fallbackAccountType,
      dispatchGroup: fallbackGroup,
      permissions: getDefaultPermissions(fallbackAccountType, fallbackGroup),
      isSandboxOverride: false,
    };
  }
}


const SessionContext = createContext<SessionContextType>({
  currentUser: null,
  firebaseUser: null,
  permissions: defaultOfficePermissions,
  isLoading: true,
  isAuthenticated: false,
  isSandboxOverride: false,
  signInWithEmail: async () => {},
  signInWithGoogle: async () => {},
  sendPasswordReset: async () => {},
  signOut: async () => {},
  switchRole: () => {},
  resetSandboxOverride: () => {},
  hasPermission: () => false,
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => getInitialCachedSession().session);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSandboxOverride, setIsSandboxOverride] = useState<boolean>(() => getInitialCachedSession().isSandbox);

  // Initialize and listen to Firebase Auth + Firestore User document
  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    // Check if user previously explicitly signed out on this browser
    const hasExplicitlySignedOut = typeof window !== 'undefined' && localStorage.getItem(EXPLICIT_SIGN_OUT_KEY) === 'true';
    if (hasExplicitlySignedOut) {
      setCurrentUser(null);
      setIsLoading(false);
    } else {
      const cached = getInitialCachedSession();
      if (cached.session) {
        setCurrentUser(cached.session);
        setIsSandboxOverride(cached.isSandbox);
      }
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      setFirebaseUser(user);

      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (user) {
        try {
          // 1. First check doc by user.uid
          const userDocRef = doc(db, 'users', user.uid);
          const directSnap = await getDoc(userDocRef);
          
          let targetDocRef = userDocRef;
          let docData: any = null;

          if (directSnap.exists()) {
            docData = { id: directSnap.id, ...directSnap.data() };
          } else if (user.email) {
            // 2. Query collection 'users' by email
            const usersCol = collection(db, 'users');
            const q = query(usersCol, where('email', '==', user.email.trim()));
            const querySnap = await getDocs(q);
            if (!querySnap.empty) {
              const matchingDoc = querySnap.docs[0];
              targetDocRef = doc(db, 'users', matchingDoc.id);
              docData = { id: matchingDoc.id, ...matchingDoc.data() };
            }
          }

          if (docData) {
            const session = buildUserSession(targetDocRef.id, user, docData);
            setCurrentUser(session);
            persistCachedSession(session);
            setIsSandboxOverride(false);
            setIsLoading(false);

            // Listen in real-time to this target doc
            unsubscribeSnapshot = onSnapshot(
              targetDocRef,
              (snap) => {
                if (snap.exists()) {
                  const updatedSession = buildUserSession(targetDocRef.id, user, { id: snap.id, ...snap.data() });
                  setCurrentUser(updatedSession);
                  persistCachedSession(updatedSession);
                }
              },
              (err) => console.warn('Real-time user listener error:', err)
            );
          } else {
            // Check canonical mock matching by email or fallback
            const session = buildUserSession(user.uid, user, null);
            setCurrentUser(session);
            persistCachedSession(session);
            setIsSandboxOverride(false);
            setIsLoading(false);
          }
        } catch (err) {
          console.error('Firestore user profile listener error:', err);
          const fallbackSession = buildUserSession(user.uid, user, null);
          setCurrentUser(fallbackSession);
          persistCachedSession(fallbackSession);
          setIsSandboxOverride(false);
          setIsLoading(false);
        }
      } else {
        // Unauthenticated
        const isSignedOut = typeof window !== 'undefined' && localStorage.getItem(EXPLICIT_SIGN_OUT_KEY) === 'true';
        if (isSignedOut) {
          setCurrentUser(null);
          persistCachedSession(null);
          setIsLoading(false);
        } else {
          // If the visitor has not explicitly signed out, auto-authenticate with demo admin credentials
          try {
            await signInWithEmailAndPassword(auth, 'admin@apex.com', 'Fsmdemo2026!');
          } catch (autoErr) {
            console.warn('Demo background auto-signin fallback to mock demo session:', autoErr);
            const fallbackSession = getDefaultDemoSession();
            setCurrentUser(fallbackSession);
            persistCachedSession(fallbackSession);
            setIsLoading(false);
          }
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  const fetchAndBuildSession = async (user: FirebaseUser): Promise<UserSession> => {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const directSnap = await getDoc(userDocRef);
      if (directSnap.exists()) {
        return buildUserSession(directSnap.id, user, { id: directSnap.id, ...directSnap.data() });
      }
      if (user.email) {
        const usersCol = collection(db, 'users');
        const q = query(usersCol, where('email', '==', user.email.trim()));
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          const matchingDoc = querySnap.docs[0];
          return buildUserSession(matchingDoc.id, user, { id: matchingDoc.id, ...matchingDoc.data() });
        }
      }
    } catch (err) {
      console.warn('Error fetching Firestore user session:', err);
    }
    return buildUserSession(user.uid, user, null);
  };

  // Sign in with Email and Password
  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    setIsLoading(true);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(EXPLICIT_SIGN_OUT_KEY);
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const user = userCredential.user;
      setFirebaseUser(user);
      const session = await fetchAndBuildSession(user);
      setCurrentUser(session);
      persistCachedSession(session);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  }, []);

  // Sign in with Google Popup
  const signInWithGoogle = useCallback(async () => {
    setIsLoading(true);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(EXPLICIT_SIGN_OUT_KEY);
    }
    try {
      const userCredential = await signInWithPopup(auth, googleAuthProvider);
      const user = userCredential.user;
      setFirebaseUser(user);
      const session = await fetchAndBuildSession(user);
      setCurrentUser(session);
      persistCachedSession(session);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  }, []);

  // Send Password Reset Email
  const sendPasswordReset = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  // Sign out method
  const signOut = useCallback(async () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(EXPLICIT_SIGN_OUT_KEY, 'true');
      localStorage.removeItem(DEV_SANDBOX_STORAGE_KEY);
      localStorage.removeItem(PORTAL_CACHED_SESSION_KEY);
    }
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn('Firebase sign out warning:', e);
    }
    setCurrentUser(null);
    setFirebaseUser(null);
    setIsSandboxOverride(false);
  }, []);

  // Dev Sandbox role switcher (active for interactive demo preview)
  const switchRole = useCallback((accountType: AccountType, dispatchGroup: DispatchGroupCategory) => {
    const updatedSession: UserSession = {
      id: currentUser?.id || 'demo-admin-uid',
      uid: currentUser?.uid || 'demo-admin-uid',
      name: currentUser?.name || 'Alex Reynolds',
      email: currentUser?.email || 'admin@apex.com',
      accountType,
      dispatchGroup,
      permissions: getDefaultPermissions(accountType, dispatchGroup),
      isSandboxOverride: true,
    };

    setCurrentUser(updatedSession);
    setIsSandboxOverride(true);

    try {
      localStorage.setItem(DEV_SANDBOX_STORAGE_KEY, JSON.stringify(updatedSession));
    } catch (err) {
      console.warn('Error saving dev sandbox session:', err);
    }
  }, [currentUser]);

  // Reset Dev Sandbox override back to real authenticated user
  const resetSandboxOverride = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DEV_SANDBOX_STORAGE_KEY);
    }
    setIsSandboxOverride(false);

    if (firebaseUser) {
      const fallbackAccountType: AccountType = (firebaseUser.email?.toLowerCase().includes('admin') ? 'admin' : 'office');
      const fallbackGroup: DispatchGroupCategory = 'office_staff';
      setCurrentUser({
        id: firebaseUser.uid,
        uid: firebaseUser.uid,
        name: cleanUserDisplayName(firebaseUser.displayName || (fallbackAccountType === 'admin' ? 'Alex Reynolds' : 'Demo Staff')),
        email: firebaseUser.email || '',
        accountType: fallbackAccountType,
        dispatchGroup: fallbackGroup,
        permissions: getDefaultPermissions(fallbackAccountType, fallbackGroup),
        isSandboxOverride: false,
      });
    } else {
      setCurrentUser(getDefaultDemoSession());
    }
  }, [firebaseUser]);

  // Check specific permission against active user session
  const hasPermission = useCallback((permission: keyof UserPermissions): boolean => {
    if (!currentUser) return false;
    const value = currentUser.permissions[permission];
    return typeof value === 'boolean' ? value : false;
  }, [currentUser]);

  const value = useMemo(
    () => ({
      currentUser,
      firebaseUser,
      permissions: currentUser?.permissions || defaultOfficePermissions,
      isLoading,
      isAuthenticated: !!currentUser,
      isSandboxOverride,
      signInWithEmail,
      signInWithGoogle,
      sendPasswordReset,
      signOut,
      switchRole,
      resetSandboxOverride,
      hasPermission,
    }),
    [
      currentUser,
      firebaseUser,
      isLoading,
      isSandboxOverride,
      signInWithEmail,
      signInWithGoogle,
      sendPasswordReset,
      signOut,
      switchRole,
      resetSandboxOverride,
      hasPermission,
    ]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextType {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
