'use client';

import axios from 'axios';
import Link from 'next/link';
import { useState } from 'react';
import { registerApi } from '@/lib/api/auth';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || fallback;
  }

  return fallback;
};

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setLoading(true);

    try {
      await registerApi(fullName.trim(), email.trim(), password);

      setSuccess('Compte créé avec succès. Vous pouvez maintenant vous connecter.');
      setFullName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          'Impossible de créer le compte. Réessayez plus tard.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
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
            <p className="login-subtitle">Créer un compte utilisateur</p>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger py-2 px-3 mb-3">
            <i className="bi bi-exclamation-triangle-fill me-2" />
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success py-2 px-3 mb-3">
            <i className="bi bi-check-circle-fill me-2" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-floating mb-3">
            <input
              type="text"
              className="form-control pms-input"
              id="fullName"
              placeholder="Nom complet"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              autoComplete="name"
              required
            />

            <label htmlFor="fullName">
              <i className="bi bi-person me-2" />
              Nom complet
            </label>
          </div>

          <div className="form-floating mb-3">
            <input
              type="email"
              className="form-control pms-input"
              id="email"
              placeholder="E-mail"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />

            <label htmlFor="email">
              <i className="bi bi-envelope me-2" />
              E-mail
            </label>
          </div>

          <div className="form-floating mb-3">
            <input
              type="password"
              className="form-control pms-input"
              id="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />

            <label htmlFor="password">
              <i className="bi bi-lock me-2" />
              Mot de passe
            </label>
          </div>

          <div className="form-floating mb-4">
            <input
              type="password"
              className="form-control pms-input"
              id="confirmPassword"
              placeholder="Confirmer le mot de passe"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />

            <label htmlFor="confirmPassword">
              <i className="bi bi-shield-lock me-2" />
              Confirmer le mot de passe
            </label>
          </div>

          <button
            type="submit"
            className="btn btn-pms w-100 py-3"
            disabled={loading}
          >
            {loading ? 'Création en cours...' : 'Créer le compte'}
          </button>

          <p className="text-center mt-4 mb-0">
            Vous avez déjà un compte ?{' '}
            <Link href="/login" className="forgot-link">
              Se connecter
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}