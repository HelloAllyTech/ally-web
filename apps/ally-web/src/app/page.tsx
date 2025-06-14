'use client';

import { useRouter } from 'next/navigation';

import { ResourceSearch } from '@ally-ui-mono/ui-shared';

export default function Index() {
  const router = useRouter();

  return (
    <main className="w-full min-h-screen flex flex-col justify-center items-center gap-4">
      <ResourceSearch onSearch={() => router.push('/search')} />
    </main>
  );
}
