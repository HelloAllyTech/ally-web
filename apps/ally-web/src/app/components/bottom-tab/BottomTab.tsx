'use client';
import Link from 'next/link';

const BottomTab = () => {
    const tabs = [
        { id: 'about', label: 'About', href: '/about' },
        { id: 'community', label: 'Community', href: 'https://community.helloally.ai/' },
        { id: 'data-policy', label: 'Data policy', href: '/data-policy' },
    ];

    const isExternalLink = (href: string) => {
        return href.startsWith('http://') || href.startsWith('https://');
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-[30px] z-[1000]">
            <div className="w-[400px] mx-auto flex justify-around items-center px-4 font-['IBM_Plex_Serif'] text-[14px]">
                {tabs.map((tab) => {
                    const isExternal = isExternalLink(tab.href);
                    
                    if (isExternal) {
                        return (
                            <a
                                key={tab.id}
                                href={tab.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="py-2 px-4 rounded-full transition-all hover:text-gray-800 hover:bg-black/5"
                            >
                                {tab.label}
                            </a>
                        );
                    }

                    return (
                        <Link
                            key={tab.id}
                            href={tab.href}
                            className="py-2 px-4 rounded-full transition-all hover:text-gray-800 hover:bg-black/5"
                        >
                            {tab.label}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomTab;
