import { useState, useEffect } from "react";
import { Navigate, Route, Routes, useNavigate, useLocation } from "react-router-dom";

import { CallLogs, LiveCall, Home, Dashboard } from "@/pages";
import { NavSideBar, PageHeader } from "@/components";
import { useUser } from "@/hooks";
import { TabId, TabLabel } from "@/constants/tabs";
import { ROUTES, TAB_ROUTES } from "@/constants/routes";
import { UserRole } from "@/types/user";

const PrivateRouteLayout = () => {
    const { user, logout, checkAuth } = useUser();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const isClient = user?.role === UserRole.CLIENT;
    const [activeTab, setActiveTab] = useState<TabId>(TabId.HOME);

    useEffect(() => {
        const verifyAuth = async () => {
            const userData = await checkAuth();
            if (!userData) {
                navigate(ROUTES.LOGIN);
            }
        };
        verifyAuth();
    }, []);

    useEffect(() => {
        setActiveTab(getActiveTab());
    }, [pathname])

    const getActiveTab = () => {
        switch (pathname) {
            case ROUTES.LIVE_CALL:
                return TabId.LIVE_CALL;
            case ROUTES.CALL_LOGS:
                return TabId.CALL_LOGS;
            case ROUTES.DASHBOARD:
                return TabId.HOME;
            case ROUTES.HOME:
                return TabId.HOME;
            default:
                return TabId.HOME;
        }
    };

    const handleTabChange = (tab: string) => {
        navigate(tab);
    };

    const handleLogout = () => {
        logout();
        navigate(ROUTES.LOGIN);
    };

    const getTabTitle = (tabId: TabId) => {
        if (tabId === TabId.HOME) {
            return isClient ? TabLabel[TabId.HOME] : TabLabel[TabId.DASHBOARD];
        }
        return TabLabel[tabId];
    };

    const excludeDefaultPageHeader = [ROUTES.LIVE_CALL] as string[];
    if (user)
        return (
            <div className="flex h-screen w-full bg-gray-100">
                <NavSideBar
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                />
                <div className="flex-1 min-h-screen overflow-auto custom-scrollbar pl-16">
                    {!excludeDefaultPageHeader.includes(pathname) && (
                        <PageHeader
                            showSearch={false}
                            title={getTabTitle(activeTab)}
                            onLogout={handleLogout}
                        />
                    )}
                    <Routes>
                        <Route index element={isClient ? <Home /> : <Navigate to={ROUTES.DASHBOARD} />} />
                        <Route path={ROUTES.LIVE_CALL} element={<LiveCall handleLogout={handleLogout} />} />
                        {!isClient && <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />}
                        <Route path={ROUTES.CALL_LOGS} element={<CallLogs />} />
                        <Route
                            path="*"
                            element={
                                <Navigate to="/" replace />
                            }
                        />
                    </Routes>
                </div>
            </div>
        );
    else return <></>;
};

export default PrivateRouteLayout; 