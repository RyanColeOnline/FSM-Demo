import JobDetailsClient from './JobDetailsClient';
import { CANONICAL_MOCK_APPOINTMENTS } from '@murphys/domain';

export const dynamicParams = true;

export function generateStaticParams() {
  const ids = new Set<string>([
    '134375',
    '134186',
    '134183',
    '134180',
    '134182',
    '134184',
    '133691',
    '133860',
    '133907',
    '133554',
    '133404',
    '133320',
    '133917',
    '134141',
    ...CANONICAL_MOCK_APPOINTMENTS.map((a) => a.id),
    ...CANONICAL_MOCK_APPOINTMENTS.map((a) => String(a.jobNumber || a.id)),
    ...Array.from({ length: 50 }, (_, i) => `job-${i + 1}`),
  ]);
  return Array.from(ids).map((id) => ({ id }));
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <JobDetailsClient params={resolvedParams} />;
}
