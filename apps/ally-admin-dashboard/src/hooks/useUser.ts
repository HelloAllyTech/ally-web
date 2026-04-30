import { useCallback, useMemo } from "react";

import { useSelector } from "react-redux";

import { logger } from "@ally-ui-mono/ui-shared";
import {
  useLazyGetUserQuery,
  useLazyGetPermissionsQuery,
  baseAPI,
  useGetProfileImageUrlMutation,
  useDeleteProfileImageMutation,
  useUploadProfileImageMutation,
} from "@api";
import { NavigationItem } from "@components/types";
import { LOCAL_STORAGE_KEYS, ROUTES, en, SIDEBAR_ITEMS, Permissions } from "@constants";
import { setUser, authenticate, unauthenticate, setPermissions } from "@reducer";
import { RootState, store } from "@store";

export const useUser = () => {
  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);
  const { availableChatTypes, user, userStatus } = useSelector((state: RootState) => state.user);
  const permissions = useSelector((state: RootState) => state.user.permissions);

  const [getUser, { isLoading: isUserLoading }] = useLazyGetUserQuery();
  const [getPermissions, { isLoading: isPermissionsLoading }] = useLazyGetPermissionsQuery();
  const [getProfileUrl] = useGetProfileImageUrlMutation();
  const [deleteProfile] = useDeleteProfileImageMutation();
  const [uploadProfileImage] = useUploadProfileImageMutation();

  /**
   * Refetches user data and updates Redux store
   * Used when profile is updated to reflect changes immediately
   */
  const refetchUser = async () => {
    try {
      const userData = await getUser();
      if (userData?.data) {
        store.dispatch(setUser(userData.data));
      }
      return userData?.data;
    } catch (error) {
      logger.info(`Error refetching user: ${error}`);
      return null;
    }
  };

  const navigationItems: NavigationItem[] = [
    {
      id: SIDEBAR_ITEMS.SIMULATION_STUDIO,
      label: en.simulation.rolePlays,
      path: ROUTES.SIMULATION_STUDIO,
    },
    {
      id: SIDEBAR_ITEMS.EVENTS,
      label: en.simulation.events,
      path: ROUTES.MANAGE_EVENTS,
    },

    {
      id: SIDEBAR_ITEMS.CHARACTER_LIBRARY,
      label: "Characters",
      path: ROUTES.CHARACTER_LIBRARY,
    },

    {
      id: SIDEBAR_ITEMS.SCENARIO_VOICES,
      label: en.simulation.voices,
      path: ROUTES.MANAGE_SCENARIO_VOICES,
    },
    {
      id: SIDEBAR_ITEMS.SCENARIO_LANGUAGES,
      label: en.simulation.languages,
      path: ROUTES.MANAGE_SCENARIO_LANGUAGES,
    },
    {
      id: SIDEBAR_ITEMS.PROMPTS,
      label: en.simulation.prompts,
      path: ROUTES.MANAGE_PROMPTS,
    },
    {
      id: SIDEBAR_ITEMS.MANAGE_GUARDRAILS,
      label: en.simulation.guardrails,
      path: ROUTES.MANAGE_GUARDRAILS,
    },
    {
      id: SIDEBAR_ITEMS.TRANSLATIONS,
      label: "Translations",
      path: ROUTES.MANAGE_TRANSLATIONS,
    },
    {
      id: SIDEBAR_ITEMS.USERS,
      label: en.userManagement.users,
      path: ROUTES.USER_MANAGEMENT,
    },
    {
      id: SIDEBAR_ITEMS.USER_BADGES,
      label: en.userManagement.badges,
      path: ROUTES.USER_BADGES,
    },
  ];

  /**
   * Checks user authentication status and fetches user data if authenticated.
   * - Checks for access token in localStorage
   * - Fetches user data and permissions if token exists
   * - Updates Redux store with user information
   * - Handles authentication errors by logging out
   * @returns {Promise<Object|null>} User data object if authenticated, null otherwise
   */
  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN);
      if (token) {
        try {
          const userData = await getUser();
          const permissionsData = await getPermissions();
          store.dispatch(setUser(userData?.data));
          store.dispatch(setPermissions(permissionsData?.data as any));
          store.dispatch(authenticate());
          return userData?.data;
        } catch (error) {
          logger.info(`Error fetching user or permissions:, ${error}`);
          logout();
          return null;
        }
      } else {
        logout();
        return null;
      }
    } catch (error) {
      logger.info(`Error authenticating - ${error}`);
      logout();
      return null;
    }
  }, [getUser, getPermissions]);

  /**
   * Logs out the user by clearing all authentication data and state.
   * - Clears RTK Query cache
   * - Resets user state in Redux store
   * - Removes authentication tokens from localStorage
   * - Dispatches unauthenticate action
   */
  const logout = () => {
    // Clear RTK Query cache
    store.dispatch(baseAPI.util.resetApiState());

    // Clear user state
    store.dispatch(setUser(null));
    store.dispatch(setPermissions([]));
    store.dispatch(unauthenticate());

    // Clear tokens
    localStorage.removeItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN);
  };

  const filteredNavigationItems = useMemo(() => {
    // Return empty array if permissions are not loaded yet
    if (!permissions || permissions.length === 0) {
      return [];
    }

    // Filter navigation items based on user permissions
    return navigationItems.filter(item => {
      switch (item.id) {
        case SIDEBAR_ITEMS.SIMULATION_STUDIO:
          return permissions.includes(Permissions.EDIT_SCENARIO);
        case SIDEBAR_ITEMS.EVENTS:
          return permissions.includes(Permissions.EDIT_EVENT);
        case SIDEBAR_ITEMS.CHARACTER_LIBRARY:
          return permissions.includes(Permissions.EDIT_CHARACTER_LIBRARY);
        case SIDEBAR_ITEMS.SCENARIO_VOICES:
          return permissions.includes(Permissions.EDIT_SCENARIO_VOICE);
        case SIDEBAR_ITEMS.SCENARIO_LANGUAGES:
          return permissions.includes(Permissions.EDIT_SCENARIO_LANGUAGE);
        case SIDEBAR_ITEMS.PROMPTS:
          return permissions.includes(Permissions.EDIT_PROMPT);
        case SIDEBAR_ITEMS.USERS:
          return (
            permissions.includes(Permissions.EDIT_USER) ||
            permissions.includes(Permissions.VIEW_USERS)
          );
        case SIDEBAR_ITEMS.MANAGE_GUARDRAILS:
          return permissions.includes(Permissions.EDIT_GUARDRAIL);
        case SIDEBAR_ITEMS.TRANSLATIONS:
          return permissions.includes(Permissions.VIEW_I18N_TRANSLATIONS);
        case SIDEBAR_ITEMS.USER_BADGES:
          return permissions.includes(Permissions.VIEW_ADMIN_BADGE);
        default:
          return true;
      }
    });
  }, [permissions]);

  return {
    availableChatTypes,
    checkAuth,
    refetchUser,
    isAuthLoading: isUserLoading || isPermissionsLoading,
    isAuthenticated,
    logout,
    permissions,
    setUser,
    user,
    userStatus,
    filteredNavigationItems,
    getProfileUrl,
    deleteProfile,
    uploadProfileImage,
  };
};
