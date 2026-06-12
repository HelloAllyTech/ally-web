import Link from "next/link";

export default function NotFound() {
  return (
    <main
      data-testid="not-found"
      className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-3 px-6 text-center font-['IBM_Plex_Serif']"
    >
      <h1 className="text-xl font-[500] text-[#1E2025]">Page not found</h1>
      <p className="max-w-md text-[15px] leading-6 text-[#525252]">
        The page you are looking for doesn&apos;t exist or may have moved.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-[8px] border border-[#DADCE1] bg-[#1E2025] px-5 py-2 text-[15px] text-white transition-colors hover:bg-[#33363D]"
      >
        Back to search
      </Link>
    </main>
  );
}
