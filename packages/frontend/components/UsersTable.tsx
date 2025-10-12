'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import UpdateSubscriptionDialog from './UpdateSubscriptionDialog';

type Subscription = {
  plan: 'BASIC' | 'PREMIUM' | 'VIP' | null;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PENDING' | null;
  endDate: string | null;
};

type UserRow = {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  subscription: Subscription | null;
  _count?: {
    referrals: number;
  };
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export default function UsersTable() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const query = useMemo(() => ({ page, limit, search: search || undefined }), [page, limit, search]);

  const [editingUser, setEditingUser] = useState<UserRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/admin/users', { params: query })
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data;
        setRows(data?.users ?? []);
        setPagination(data?.pagination ?? null);
      })
      .catch((err) => {
        console.error(err);
        toast.error(err?.response?.data?.message || 'Грешка при зареждане на потребители');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const refresh = () => {
    api
      .get('/admin/users', { params: query })
      .then((res) => {
        const data = res.data?.data;
        setRows(data?.users ?? []);
        setPagination(data?.pagination ?? null);
      })
      .catch((err) => {
        console.error(err);
        toast.error('Грешка при опресняване');
      });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Търси по email"
          className="border px-2 py-1 rounded"
        />
        <select
          value={limit}
          onChange={(e) => {
            setLimit(Number(e.target.value));
            setPage(1);
          }}
          className="border px-2 py-1 rounded"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>

      <div className="border rounded bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="p-2">Email</th>
              <th className="p-2">Роля</th>
              <th className="p-2">Регистрация</th>
              <th className="p-2">Абонамент</th>
              <th className="p-2">Реферали</th>
              <th className="p-2">Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-2" colSpan={6}>
                  Зареждане...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="p-2" colSpan={6}>
                  Няма резултати
                </td>
              </tr>
            ) : (
              rows.map((u) => {
                const sub = u.subscription;
                return (
                  <tr key={u.id} className="border-t">
                    <td className="p-2">{u.email}</td>
                    <td className="p-2">{u.role}</td>
                    <td className="p-2">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="p-2">
                      {sub
                        ? `${sub.plan ?? '-'} / ${sub.status ?? '-'}${
                            sub.endDate ? ' / до ' + new Date(sub.endDate).toLocaleDateString() : ''
                          }`
                        : '—'}
                    </td>
                    <td className="p-2">{u._count?.referrals ?? 0}</td>
                    <td className="p-2">
                      <button
                        onClick={() => setEditingUser(u)}
                        className="text-primary-600 hover:underline"
                      >
                        Update Subscription
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2">
        {pagination && (
          <>
            <span className="text-sm">
              Страница {pagination.page} от {pagination.pages} (общо {pagination.total})
            </span>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="border px-2 py-1 rounded disabled:opacity-50"
            >
              Назад
            </button>
            <button
              disabled={pagination && page >= pagination.pages}
              onClick={() => setPage((p) => p + 1)}
              className="border px-2 py-1 rounded disabled:opacity-50"
            >
              Напред
            </button>
          </>
        )}
      </div>

      {editingUser && (
        <UpdateSubscriptionDialog
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => {
            setEditingUser(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}