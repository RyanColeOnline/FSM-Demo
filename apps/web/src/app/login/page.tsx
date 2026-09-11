'use client';

/**
 * Clean & Elegant Login Screen for Demo FSM Field Portal.
 * Supports Email/Password and Google Sign-In via Firebase Auth.
 */

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, EXPLICIT_SIGN_OUT_KEY } from '@/auth/sessionStore';
import { Mail, Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui';

function LoginFormContent() {
  const router = useRouter();
  const { currentUser, isLoading, signInWithEmail, signInWithGoogle, sendPasswordReset } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot Password modal/view state
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // If already authenticated, redirect directly to /schedule
  useEffect(() => {
    if (!isLoading && currentUser) {
      router.replace('/schedule');
    }
  }, [currentUser, isLoading, router]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await signInWithEmail(email, password);
      router.replace('/schedule');
    } catch (err: any) {
      console.error('Sign-in error:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setErrorMessage('Invalid email address or password. Please check your credentials.');
      } else if (err.code === 'auth/too-many-requests') {
        setErrorMessage('Access temporarily locked due to multiple failed attempts. Please try again later.');
      } else {
        setErrorMessage(err.message || 'Unable to sign in. Please verify your connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsGoogleSubmitting(true);

    try {
      await signInWithGoogle();
      router.replace('/schedule');
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        // User dismissed popup, silently ignore
      } else {
        setErrorMessage(err.message || 'Failed to sign in with Google. Please try again.');
      }
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleSendPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;

    setResetError(null);
    setResetLoading(true);

    try {
      await sendPasswordReset(resetEmail);
      setResetSent(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/user-not-found') {
        setResetError('No user account found with this email address.');
      } else {
        setResetError(err.message || 'Failed to send password reset email. Please try again.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
      {!isForgotPassword ? (
        <>
          {/* Error Alert Banner */}
          {errorMessage && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl flex items-start gap-3 text-red-200 text-sm animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleEmailSignIn} className="space-y-3">
            {/* Email Input */}
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Forgot Password Link Underneath Password */}
            <div className="flex justify-end pt-0.5">
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setIsForgotPassword(true);
                  setResetSent(false);
                  setResetError(null);
                }}
                className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                Forgot your password?
              </button>
            </div>

            {/* Primary Sign In Button */}
            <Button
              type="submit"
              disabled={isSubmitting || isGoogleSubmitting || !email.trim() || !password}
              className="w-full justify-center bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-blue-900/30 transition-all duration-200"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <span>Sign In</span>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-700 w-full" />
            <span className="bg-slate-800 px-3 text-xs uppercase tracking-wider text-slate-400 absolute">
              or
            </span>
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting || isGoogleSubmitting}
            className="w-full flex items-center justify-center gap-3 bg-slate-900/90 hover:bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-200 font-medium py-2.5 px-4 rounded-xl transition-colors shadow-sm disabled:opacity-50"
          >
            {isGoogleSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Sign in with Google</span>
          </button>
        </>
      ) : (
        /* Forgot Password Flow */
        <div className="space-y-5">
          <div className="text-center space-y-1.5">
            <h2 className="text-xl font-bold tracking-tight text-white">
              Reset Your Password
            </h2>
            <p className="text-xs text-slate-400">
              Enter your email address to receive a password reset link.
            </p>
          </div>

          {resetSent ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-950/60 border border-emerald-800/80 rounded-xl flex items-start gap-3 text-emerald-200 text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-300">Password Reset Email Sent</p>
                  <p className="text-xs text-emerald-200/90 mt-1">
                    We sent a link to <span className="font-semibold">{resetEmail}</span>. Please check your inbox and follow the instructions to set a new password.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setResetSent(false);
                }}
                className="w-full justify-center bg-slate-700 hover:bg-slate-600 text-white font-medium py-2.5 rounded-xl transition-colors"
              >
                Return to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSendPasswordReset} className="space-y-3">
              {resetError && (
                <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl flex items-start gap-3 text-red-200 text-sm">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <span>{resetError}</span>
                </div>
              )}

              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="Email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={resetLoading || !resetEmail.trim()}
                  className="w-full justify-center bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-blue-900/30 transition-all duration-200"
                >
                  {resetLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <span>Send Reset Link</span>
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="text-xs text-slate-400 hover:text-slate-200 font-medium text-center py-2 transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Center Group: Logo + Auth Card brought together */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md mx-auto z-10 pt-2 pb-6">
        {/* Header Title */}
        <div className="text-center pb-6 -mt-4 space-y-1">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-md">
            Demo FSM
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Field Service Management Portal
          </p>
        </div>

        {/* Center Auth Card Wrapped in Suspense */}
        <main className="w-full">
          <Suspense
            fallback={
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
              </div>
            }
          >
            <LoginFormContent />
          </Suspense>
        </main>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 max-w-4xl mx-auto w-full pb-2">
        Apex Field Solutions LLC &copy; {new Date().getFullYear()} &bull; Field Service Management Platform
      </footer>
    </div>
  );
}
