'use client';

import AdminLayout from '../../../components/AdminLayout';
import UsersTable from '../../../components/UsersTable';

export default function AdminUsersPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Управление на потребители</h1>
        </div>
        <UsersTable />
      </div>
    </AdminLayout>
  );
}