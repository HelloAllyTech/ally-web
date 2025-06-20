'use client';
import { ResourceSearch } from '@ally-ui-mono/ui-shared';
import { useRouter } from 'next/navigation';

export default function Index() {
  const router = useRouter();

  const onSearch = (searchTerm: string) => {
    router.push(`/search?q=${encodeURIComponent(searchTerm)}`);
  };

  return (
    <main className="w-full min-h-screen flex flex-col justify-center items-center  sm:px-[15%] px-[5%] pb-[100px] overflow-y-hidden">
      <ResourceSearch searchQuery="" categories={[]} selectedCategory="" setSelectedCategory={() => { }} onInfiniteScroll={() => { }} onSearch={onSearch} resources={[]} isLoading={false} />
    </main>
  );
}
