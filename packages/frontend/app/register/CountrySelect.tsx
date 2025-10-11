import { UseFormRegisterReturn } from 'react-hook-form';

const COUNTRIES = [
  { code: 'BG', name: 'Bulgaria' },
  { code: 'RO', name: 'Romania' },
  { code: 'GR', name: 'Greece' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
];

export function CountrySelect(props: { field: UseFormRegisterReturn; error?: string }) {
  const { field, error } = props;
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">Country</label>
      <select {...field} className="input mt-1">
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}