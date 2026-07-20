'use client';

import axios from 'axios';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth/AuthContext';

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginSkeleton() {
  return (
    <div className="login-screen">
      <div className="login-bg-shapes">
        <div className="shape shape-1" />
        <div className="shape shape-2" />
        <div className="shape shape-3" />
      </div>

      <div className="login-card glass-card text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((state) => state.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setError('');
    setLoading(true);

    try {
      await login(email.trim(), password);

      const redirect = searchParams.get('redirect') || '/dashboard';

      router.push(redirect);
    } catch (requestError) {
      if (axios.isAxiosError(requestError)) {
        setError(
          requestError.response?.data?.message ||
            'Impossible de se connecter. Réessayez plus tard.'
        );
      } else {
        setError('E-mail ou mot de passe incorrect.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="loginScreen" className="login-screen">
      <div className="login-bg-shapes">
        <div className="shape shape-1" />
        <div className="shape shape-2" />
        <div className="shape shape-3" />
      </div>

      <div className="login-card glass-card">
        <div className="login-logo mb-4">
          <div className="logo-icon">
            <i className="bi bi-building text-white" />
          </div>

          <div>
            <h1 className="login-title">OASIS PMS</h1>
            <p className="login-subtitle">Property Management System</p>
          </div>
        </div>

        {error && (
          <div
            className="alert alert-danger py-2 px-3 mb-3 text-xs"
            style={{ fontSize: '0.8rem', borderRadius: '8px' }}
          >
            <i className="bi bi-exclamation-triangle-fill me-2" />
            {error}
          </div>
        )}

        <form id="loginForm" onSubmit={handleSubmit} className="mt-2">
          <div className="form-floating mb-3">
            <input
              type="email"
              className="form-control pms-input"
              id="loginEmail"
              placeholder="E-mail"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />

            <label htmlFor="loginEmail">
              <i className="bi bi-envelope me-2" />
              E-mail
            </label>
          </div>

          <div className="form-floating mb-3 position-relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-control pms-input"
              id="loginPass"
              placeholder="Mot de passe"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />

            <label htmlFor="loginPass">
              <i className="bi bi-lock me-2" />
              Mot de passe
            </label>

            <button
              type="button"
              className="pass-toggle border-0 bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={
                showPassword
                  ? 'Masquer le mot de passe'
                  : 'Afficher le mot de passe'
              }
            >
              <i
                className={`bi ${
                  showPassword ? 'bi-eye-slash' : 'bi-eye'
                }`}
              />
            </button>
          </div>

          <Link href="/forgot-password" className="forgot-link d-block text-end mb-4">
            Mot de passe oublié ?
          </Link>

          <button
            id="loginBtn"
            type="submit"
            className="btn btn-pms w-100 py-3"
            disabled={loading}
          >
            {loading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                />
                Connexion en cours...
              </>
            ) : (
              <>
                <i className="bi bi-arrow-right-circle me-2" />
                Se connecter
              </>
            )}
          </button>

          <p className="text-center mt-4 mb-0">
            Vous n&apos;avez pas de compte ?{' '}
            <Link href="/register" className="forgot-link">
              Créer un compte
            </Link>
          </p>

          <div className="biometric-row mt-4">
            <button
              type="button"
              className="btn-bio"
              title="Touch ID bientôt disponible"
              disabled
            >
              <i className="bi bi-fingerprint" />
              <span>Touch ID</span>
            </button>

            <button
              type="button"
              className="btn-bio"
              title="Face ID bientôt disponible"
              disabled
            >
              <i className="bi bi-person-bounding-box" />
              <span>Face ID</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}