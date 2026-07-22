'use client';

// ═══════════════════════════════════════════════════════════
// OASIS PMS — Gestion des utilisateurs (Admin uniquement)
// ═══════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { getUsersApi, updateUserRoleApi, deleteUserApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/auth/AuthContext';
import type { User } from '@/types';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  manager: 'Manager',
  receptionist: 'Réceptionniste',
  housekeeping_supervisor: 'Gouvernante'
};

const ROLE_BADGE_CLASSES: Record<string, string> = {
  admin: 'bg-danger-subtle text-danger-emphasis',
  manager: 'bg-primary-subtle text-primary-emphasis',
  receptionist: 'bg-info-subtle text-info-emphasis',
  housekeeping_supervisor: 'bg-warning-subtle text-warning-emphasis'
};

const ROLE_OPTIONS = Object.keys(ROLE_LABELS);

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || fallback;
  }

  return fallback;
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

export default function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await getUsersApi();
        setUsers(data);
      } catch (requestError) {
        setError(
          getErrorMessage(
            requestError,
            'Impossible de charger la liste des utilisateurs.'
          )
        );
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setError('');
    setSuccess('');
    setSavingUserId(userId);

    const previousUsers = users;

    setUsers((current) =>
      current.map((u) =>
        u.id === userId ? { ...u, role: newRole as User['role'] } : u
      )
    );

    try {
      const updatedUser = await updateUserRoleApi(userId, newRole);

      setUsers((current) =>
        current.map((u) => (u.id === userId ? updatedUser : u))
      );

      setSuccess('Rôle mis à jour avec succès.');
    } catch (requestError) {
      setUsers(previousUsers);

      setError(
        getErrorMessage(
          requestError,
          'Impossible de mettre à jour le rôle de cet utilisateur.'
        )
      );
    } finally {
      setSavingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer le compte de "${userName}" ? Cette action est irréversible.`
    );

    if (!confirmed) {
      return;
    }

    setError('');
    setSuccess('');
    setDeletingUserId(userId);

    try {
      await deleteUserApi(userId);

      setUsers((current) => current.filter((u) => u.id !== userId));
      setSuccess('Utilisateur supprimé avec succès.');
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          'Impossible de supprimer cet utilisateur.'
        )
      );
    } finally {
      setDeletingUserId(null);
    }
  };

  return (
    <div className="p-4">
      <div className="d-flex align-items-start justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="h4 mb-1">Gestion des utilisateurs</h1>
          <p className="text-muted mb-0">
            Consultez les comptes et gérez les rôles de votre équipe.
          </p>
        </div>

        {currentUser?.role === 'admin' && (
          <Link href="/register" className="btn btn-pms">
            <i className="bi bi-plus-lg me-2" />
            Ajouter un compte
          </Link>
        )}
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

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between py-3">
          <span className="fw-semibold">Comptes utilisateurs</span>
          {!loading && (
            <span className="badge bg-light text-dark border">
              {users.length} {users.length > 1 ? 'utilisateurs' : 'utilisateur'}
            </span>
          )}
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Chargement...</span>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center text-muted py-5">
              Aucun utilisateur trouvé.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr className="text-uppercase text-muted small">
                    <th className="ps-4 py-3" style={{ fontSize: '0.75rem', letterSpacing: '0.03em' }}>
                      Utilisateur
                    </th>
                    <th className="py-3" style={{ fontSize: '0.75rem', letterSpacing: '0.03em' }}>
                      Rôle
                    </th>
                    <th className="py-3 text-end pe-4" style={{ fontSize: '0.75rem', letterSpacing: '0.03em' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="ps-4">
                        <div className="d-flex align-items-center gap-3">
                          <div
                            className="d-flex align-items-center justify-content-center rounded-circle bg-primary-subtle text-primary-emphasis fw-semibold"
                            style={{ width: '38px', height: '38px', fontSize: '0.85rem', flexShrink: 0 }}
                          >
                            {getInitials(u.name)}
                          </div>

                          <div>
                            <div className="fw-medium d-flex align-items-center gap-2">
                              {u.name}
                              {currentUser?.id === u.id && (
                                <span className="badge bg-secondary-subtle text-secondary-emphasis fw-normal">
                                  Vous
                                </span>
                              )}
                            </div>
                            <div className="text-muted small">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <select
                            className="form-select form-select-sm"
                            style={{ maxWidth: '200px' }}
                            value={u.role}
                            disabled={savingUserId === u.id}
                            onChange={(event) =>
                              handleRoleChange(u.id, event.target.value)
                            }
                          >
                            {ROLE_OPTIONS.map((roleKey) => (
                              <option key={roleKey} value={roleKey}>
                                {ROLE_LABELS[roleKey] || roleKey}
                              </option>
                            ))}
                          </select>

                          {savingUserId === u.id && (
                            <span
                              className="spinner-border spinner-border-sm text-primary"
                              role="status"
                            />
                          )}
                        </div>
                      </td>

                      <td className="text-end pe-4">
                        {currentUser?.id !== u.id && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            disabled={deletingUserId === u.id}
                            onClick={() => handleDeleteUser(u.id, u.name)}
                          >
                            {deletingUserId === u.id ? (
                              <span
                                className="spinner-border spinner-border-sm"
                                role="status"
                              />
                            ) : (
                              <>
                                <i className="bi bi-trash me-1" />
                                Supprimer
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}