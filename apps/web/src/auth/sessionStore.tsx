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

const DEV_SANDBOX_STORAGE_KEY = 'murphys_dev_sandbox_session';
const defaultOfficePermissions = getDefaultPermissions('office', 'office_staff');

function buildUserSession(userId: string, user: FirebaseUser | null, data: any): UserSession {
  const actualId = data?.id || userId;
  if (data) {
    const rawAccountType =
      data.accountType ||
      data.role ||
      data.permissions?.accountType ||
      (typeof data.permissions === 'string' ? data.permissions : undefined);
    const accountType = normalizeAccountType(rawAccountType);
    const dispatchGroup = normalizeDispatchGroupCategory(
      Array.isArray(data.dispatchGroups) ? data.dispatchGroups[0] : (data.dispatchGroup || 'office_staff')
    );
    const defaultPerms = getDefaultPermissions(accountType, dispatchGroup);
    const rawPerms = typeof data.permissions === 'object' && data.permissions !== null ? data.permissions : {};
    const permissions: UserPermissions = {
      ...defaultPerms,
      ...rawPerms,
      accountType,
      hasWebPortalAccess: accountType === 'admin' || accountType === 'office',
      reportingTabVisibility: rawPerms.reportingTabVisibility !== undefined ? Boolean(rawPerms.reportingTabVisibility) : defaultPerms.reportingTabVisibility,
      moreAppsAndSettingsVisibility: rawPerms.moreAppsAndSettingsVisibility !== undefined ? Boolean(rawPerms.moreAppsAndSettingsVisibility) : (accountType === 'admin' ? true : defaultPerms.moreAppsAndSettingsVisibility),
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

    const resolvedName = data.displayName || data.name || (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : '') || user?.displayName || 'Murphy Staff';

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
    const emailToMatch = (user?.email || '').toLowerCase().trim();
    const canonicalMatch = emailToMatch ? CANONICAL_OFFICIAL_USERS.find((u) => (u.email || '').toLowerCase().trim() === emailToMatch) : null;
    if (canonicalMatch) {
      return buildUserSession(canonicalMatch.id, user, canonicalMatch);
    }

    const fallbackAccountType: AccountType = 'office';
    const fallbackGroup: DispatchGroupCategory = 'office_staff';
    return {
      id: user?.uid || actualId,
      uid: user?.uid || actualId,
      name: user?.displayName || 'Murphy Staff',
      email: user?.email || '',
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
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSandboxOverride, setIsSandboxOverride] = useState<boolean>(false);

  // Initialize and listen to Firebase Auth + Firestore User document
  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    // Check for Dev Sandbox override in localStorage strictly during development
    if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
      try {
        const savedDevSession = localStorage.getItem(DEV_SANDBOX_STORAGE_KEY);
        if (savedDevSession) {
          const parsed = JSON.parse(savedDevSession) as UserSession;
          if (parsed && parsed.accountType) {
            const cleanName = (parsed.name || 'User').replace(/\s*\(.*?\)\s*/g, '').trim();
            setCurrentUser({
              ...parsed,
              name: cleanName,
              permissions: getDefaultPermissions(parsed.accountType, parsed.dispatchGroup),
              isSandboxOverride: true,
            });
            setIsSandboxOverride(true);
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Error reading dev sandbox session:', err);
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
            setIsSandboxOverride(false);
            setIsLoading(false);

            // Listen in real-time to this target doc
            unsubscribeSnapshot = onSnapshot(
              targetDocRef,
              (snap) => {
                if (snap.exists()) {
                  const updatedSession = buildUserSession(targetDocRef.id, user, { id: snap.id, ...snap.data() });
                  setCurrentUser(updatedSession);
                }
              },
              (err) => console.warn('Real-time user listener error:', err)
            );
          } else {
            // Check canonical mock matching by email or fallback
            const session = buildUserSession(user.uid, user, null);
            setCurrentUser(session);
            setIsSandboxOverride(false);
            setIsLoading(false);
          }
        } catch (err) {
          console.error('Firestore user profile listener error:', err);
          const fallbackSession = buildUserSession(user.uid, user, null);
          setCurrentUser(fallbackSession);
          setIsSandboxOverride(false);
          setIsLoading(false);
        }
      } else {
        // Unauthenticated
        setCurrentUser(null);
        setIsLoading(false);
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
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const user = userCredential.user;
      setFirebaseUser(user);
      const session = await fetchAndBuildSession(user);
      setCurrentUser(session);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  }, []);

  // Sign in with Google Popup
  const signInWithGoogle = useCallback(async () => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithPopup(auth, googleAuthProvider);
      const user = userCredential.user;
      setFirebaseUser(user);
      const session = await fetchAndBuildSession(user);
      setCurrentUser(session);
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
    if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
      localStorage.removeItem(DEV_SANDBOX_STORAGE_KEY);
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

  // Dev Sandbox role switcher (active in non-production builds)
  const switchRole = useCallback((accountType: AccountType, dispatchGroup: DispatchGroupCategory) => {
    if (process.env.NODE_ENV === 'production') {
      console.warn('switchRole is disabled in production builds.');
      return;
    }

    const updatedSession: UserSession = {
      id: currentUser?.id || 'usr-sandbox',
      uid: currentUser?.uid || 'usr-sandbox',
      name: currentUser?.name || 'Sandbox Tester',
      email: currentUser?.email || 'test@murphysservices.com',
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
      const fallbackAccountType: AccountType = 'office';
      const fallbackGroup: DispatchGroupCategory = 'office_staff';
      setCurrentUser({
        id: firebaseUser.uid,
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || 'Murphy Staff',
        email: firebaseUser.email || '',
        accountType: fallbackAccountType,
        dispatchGroup: fallbackGroup,
        permissions: getDefaultPermissions(fallbackAccountType, fallbackGroup),
        isSandboxOverride: false,
      });
    } else {
      setCurrentUser(null);
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
