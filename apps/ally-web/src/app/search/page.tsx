'use client';

import { useState } from 'react';

import { ResourceSearchResults } from '@ally-ui-mono/ui-shared';

export default function SearchPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  return (
    <main className="w-full min-h-screen flex justify-center items-center">
      <ResourceSearchResults selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} onSearch={() => {}} />
    </main>
  );
} 