'use client';
import { ResourceSearch } from '@ally-ui-mono/ui-shared';
import { useRouter } from 'next/navigation';

// TODO: Remove this once we have a real suggestions API
export const sampleSuggestions = ['Grounding techniques', 'Boundaries', 'Questions to encourage disclosure', 'Things to say to help process grief'];

export default function Index() {
  const router = useRouter();
  
  const onSearch = (searchTerm: string) => {
    router.push(`/search?q=${encodeURIComponent(searchTerm)}`);
  };

  return (
    <main className="w-full min-h-screen flex flex-col justify-center items-center gap-4">
      <ResourceSearch initialValue="" suggestions={sampleSuggestions} onSearch={onSearch}/>
    </main>
  );
}
