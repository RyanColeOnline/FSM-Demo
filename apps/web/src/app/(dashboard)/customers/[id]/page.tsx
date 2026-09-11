import CustomerProfileClient from './CustomerProfileClient';
import { CANONICAL_MOCK_CUSTOMERS } from '@murphys/domain';

export const dynamicParams = true;

export function generateStaticParams() {
  const ids = [
    'cust-1',
    'cust-2',
    'cust-3',
    'cust-pamela',
    '49106',
  ];
  return ids.map((id) => ({ id }));
}

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <CustomerProfileClient params={resolvedParams} />;
}
