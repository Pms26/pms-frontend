'use client';

import axios from 'axios';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { resetPasswordApi } from '@/lib/api/auth';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || fallback;
  }

  return fallback;
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordSkeleton />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordSkeleton() {
  return (
    <div className="login-screen">
      <div className="login-card glass-card text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!token) {
      setError('Le lien de réinitialisation est invalide.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setLoading(true);

    try {
      await resetPasswordApi(token, newPassword);

      setSuccess(
        'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.'
      );

      setNewPassword('');
      setConfirmPassword('');
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          'Le lien est invalide ou a expiré.'
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
            <i className="bi bi-shield-lock text-white" />
          </div>

          <div>
            <h1 className="login-title">Nouveau mot de passe</h1>
            <p className="login-subtitle">
              Choisissez un mot de passe sécurisé
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
          <div className="form-floating mb-3">
            <input
              type="password"
              className="form-control pms-input"
              id="newPassword"
              placeholder="Nouveau mot de passe"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />

            <label htmlFor="newPassword">
              <i className="bi bi-lock me-2" />
              Nouveau mot de passe
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
            disabled={loading || !token}
          >
            {loading
              ? 'Réinitialisation en cours...'
              : 'Réinitialiser le mot de passe'}
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