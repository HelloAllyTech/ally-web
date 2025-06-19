const BottomTabs = () => {

    // TODO: change the href to the actual links
    const tabs = [
        { id: 'about', label: 'About', href: `https://community.helloally.ai/` },
        { id: 'community', label: 'Community', href: `https://community.helloally.ai/` },
        { id: 'data-policy', label: 'Data policy', href: `https://community.helloally.ai/` },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-[30px] z-[1000]">
            <div className="w-[400px] mx-auto flex justify-around items-center px-4 font-['IBM_Plex_Serif'] text-[14px]">
                {tabs.map((tab) => (
                    <a
                        key={tab.id}
                        href={tab.href}
                        className="py-2 px-4 rounded-full transition-all hover:text-gray-800 hover:bg-black/5"
                    >
                        {tab.label}
                    </a>
                ))}
            </div>
        </nav>
    );
};

export default BottomTabs;
