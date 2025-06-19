'use client';

export default function About() {
  return (
    <main className="w-full h-screen relative">
      <iframe 
        src="https://veto-creme-56263599.figma.site/"
        className="w-full h-full border-0"
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
        allow="fullscreen"
      />
    </main>
  );
}