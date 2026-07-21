'use client';

// ═══════════════════════════════════════════════════════════
// OASIS PMS — Gestion des utilisateurs (Admin uniquement)
// ═══════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import axios from 'axios';
import { getUsersApi, updateUserRoleApi, deleteUserApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/auth/AuthContext';
import type { User } from '@/types';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  manager: 'Manager',
  receptionist: 'Réceptionniste',
  housekeeping_supervisor: 'Gouvernante'
};

const ROLE_OPTIONS = Object.keys(ROLE_LABELS);

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || fallback;
  }

  return fallback;
};

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

    // Optimistic update
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
      // Rollback en cas d'erreur
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
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="h4 mb-1">Gestion des utilisateurs</h1>
          <p className="text-muted mb-0">
            Consultez les comptes et modifiez les rôles des utilisateurs.
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

      <div className="card">
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
                  <tr>
                    <th>Nom</th>
                    <th>E-mail</th>
                    <th>Rôle</th>
                    <th style={{ width: '1%' }} />
                    <th style={{ width: '1%' }} />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        {u.name}
                        {currentUser?.id === u.id && (
                          <span className="badge bg-secondary ms-2">
                            Vous
                          </span>
                        )}
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <select
                          className="form-select form-select-sm"
                          style={{ maxWidth: '220px' }}
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
                      </td>
                      <td>
                        {savingUserId === u.id && (
                          <span
                            className="spinner-border spinner-border-sm text-primary"
                            role="status"
                          />
                        )}
                      </td>
                      <td>
                        {currentUser?.id !== u.id && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            disabled={deletingUserId === u.id}
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            title="Supprimer l'utilisateur"
                          >
                            {deletingUserId === u.id ? (
                              <span
                                className="spinner-border spinner-border-sm"
                                role="status"
                              />
                            ) : (
                              <i className="bi bi-trash" />
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