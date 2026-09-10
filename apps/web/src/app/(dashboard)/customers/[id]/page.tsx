import CustomerProfileClient from './CustomerProfileClient';
import { CANONICAL_MOCK_CUSTOMERS } from '@murphys/domain';

export const dynamicParams = true;

export function generateStaticParams() {
  const ids = new Set<string>([
    'cust-1',
    'cust-2',
    'cust-3',
    'cust-pamela',
    '49106',
    ...CANONICAL_MOCK_CUSTOMERS.map((c) => c.id),
    ...Array.from({ length: 50 }, (_, i) => `cust-${i + 1}`),
  ]);
  return Array.from(ids).map((id) => ({ id }));
}

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <CustomerProfileClient params={resolvedParams} />;
}
