'use client';
import { ResourceSearchBar } from '@ally-ui-mono/ui-shared';
import { useRouter } from 'next/navigation';

export default function Index() {
  const router = useRouter();
  const onSearch = (searchTerm: string) => {
    router.push(`/search?q=${encodeURIComponent(searchTerm)}`);
  };

  return (
    <main className="w-full min-h-screen flex flex-col justify-center items-center gap-4">
      <ResourceSearchBar initialValue="" onSearch={onSearch}/>
    </main>
  );
}
