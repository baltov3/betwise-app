'use client';

import AdminLayout from '../../../components/AdminLayout';

const mockPayments = [
  {
    id: '1',
    user: { email: 'user1@example.com' },
    amount: 19.99,
    currency: 'usd',
    method: 'stripe',
    status: 'COMPLETED',
    date: '2025-09-15T14:00:00Z'
  },
  {
    id: '2',
    user: { email: 'user2@example.com' },
    amount: 39.99,
    currency: 'usd',
    method: 'stripe',
    status: 'PENDING',
    date: '2025-09-17T11:00:00Z'
  },
];

export default function AdminPaymentsPage() {
  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Payment Report</h1>
        <p className="text-gray-600">All user payments and payouts (mock data)</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr>
              <th className="p-2 border">User</th>
              <th className="p-2 border">Amount</th>
              <th className="p-2 border">Currency</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Method</th>
              <th className="p-2 border">Date</th>
            </tr>
          </thead>
          <tbody>
            {mockPayments.map((p) => (
              <tr key={p.id}>
                <td className="p-2 border">{p.user?.email}</td>
                <td className="p-2 border">${p.amount.toFixed(2)}</td>
                <td className="p-2 border">{p.currency}</td>
                <td className="p-2 border">{p.status}</td>
                <td className="p-2 border">{p.method}</td>
                <td className="p-2 border">{new Date(p.date).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}