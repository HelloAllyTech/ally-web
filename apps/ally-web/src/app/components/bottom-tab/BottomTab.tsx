'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const BottomTab = () => {
    const pathname = usePathname();

    const tabs = [
        { id: 'about', label: 'About', href: '/about' },
        { id: 'community', label: 'Community', href: 'https://community.helloally.ai/' },
        { id: 'data-policy', label: 'Data policy', href: '/data-policy' },
    ];

    const isExternalLink = (href: string) => {
        return href.startsWith('http://') || href.startsWith('https://');
    };

    const isSelected = (href: string) => {
        if (isExternalLink(href)) return false;
        return pathname === href;
    };

    const renderTab = (tab: { id: string, label: string, href: string }) => {
        const isExternal = isExternalLink(tab.href);
        const selected = isSelected(tab.href);
        const baseClasses = "py-2 px-4 rounded-full transition-all";
        const selectedClasses = selected ? "bg-black/10 text-gray-900" : "hover:text-gray-800 hover:bg-black/5";

        if (isExternal) {
            return (
                <a
                    key={tab.id}
                    href={tab.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${baseClasses} hover:text-gray-800 hover:bg-black/5`}
                >
                    {tab.label}
                </a>
            );
        }

        return (
            <Link
                key={tab.id}
                href={tab.href}
                className={`${baseClasses} ${selectedClasses}`}
            >
                {tab.label}
            </Link>
        );
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-[10px] z-[1000] sm:py-[30px]">
            <div className="w-[300px] sm:w-[400px] mx-auto flex justify-around items-center px-4 font-['IBM_Plex_Serif'] text-[14px]">
                {tabs.map((tab) => renderTab(tab))}
            </div>
        </nav>
    );
};

export default BottomTab;
