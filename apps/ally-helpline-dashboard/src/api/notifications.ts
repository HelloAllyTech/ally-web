/**
 * Recipient-side notification feed (engagement reminders et al.): the bell in
 * the nav sidebar. Backend scopes every endpoint to the authenticated user.
 */

import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";

import { baseAPI } from "./baseAPI";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationFeedResponse {
  data: NotificationItem[];
  count: number;
}

export interface NotificationFeedQuery {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

const notificationsAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getNotifications: builder.query<NotificationFeedResponse, NotificationFeedQuery | void>({
      query: (params: NotificationFeedQuery = {}) => ({
        url: ApiEndpoints.NOTIFICATIONS.LIST,
        method: HttpMethod.GET,
        params,
      }),
      providesTags: [TAG_TYPES.NOTIFICATIONS],
    }),
    getUnreadNotificationCount: builder.query<{ count: number }, void>({
      query: () => ({
        url: ApiEndpoints.NOTIFICATIONS.UNREAD_COUNT,
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.UNREAD_NOTIFICATION_COUNT],
    }),
    markNotificationRead: builder.mutation<{ success: boolean }, string>({
      query: id => ({
        url: ApiEndpoints.NOTIFICATIONS.MARK_READ(id),
        method: HttpMethod.PATCH,
      }),
      invalidatesTags: [TAG_TYPES.NOTIFICATIONS, TAG_TYPES.UNREAD_NOTIFICATION_COUNT],
    }),
    markAllNotificationsRead: builder.mutation<{ success: boolean }, void>({
      query: () => ({
        url: ApiEndpoints.NOTIFICATIONS.MARK_ALL_READ,
        method: HttpMethod.PATCH,
      }),
      invalidatesTags: [TAG_TYPES.NOTIFICATIONS, TAG_TYPES.UNREAD_NOTIFICATION_COUNT],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadNotificationCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationsAPI;
