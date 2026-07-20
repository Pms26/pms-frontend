'use client';

import axios from 'axios';
import Link from 'next/link';
import { useState } from 'react';
import { forgotPasswordApi } from '@/lib/api/auth';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || fallback;
  }

  return fallback;
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await forgotPasswordApi(email.trim());

      setSuccess(
        'Si un compte existe avec cet e-mail, un lien de réinitialisation a été envoyé.'
      );
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          'Impossible de traiter votre demande. Réessayez plus tard.'
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
            <i className="bi bi-key text-white" />
          </div>

          <div>
            <h1 className="login-title">Mot de passe oublié</h1>
            <p className="login-subtitle">
              Recevez un lien de réinitialisation
            </p>
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
          <div className="form-floating mb-4">
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

          <button
            type="submit"
            className="btn btn-pms w-100 py-3"
            disabled={loading}
          >
            {loading
              ? 'Envoi en cours...'
              : 'Envoyer le lien de réinitialisation'}
          </button>

          <p className="text-center mt-4 mb-0">
            <Link href="/login" className="forgot-link">
              Retour à la connexion
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}