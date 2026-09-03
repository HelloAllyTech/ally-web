import { Route, Routes, BrowserRouter } from "react-router-dom";

import { ROUTES } from "@constants";
import {
  Health,
  Login,
  Learn,
  MagicLinkVerify,
  Scenario,
  CaseTrackDetails,
  TrackOverview,
  TrackPlayer,
  SuspendedUser,
  ImpersonateHandler,
  Terms,
  Privacy,
  Blog,
  BlogPost,
  Changelog,
  Sjt1,
} from "@pages";

import { PageviewTracker } from "../analytics";
import HybridRouteLayout from "./HybridRouteLayout";
import PrivateRouteLayout from "./PrivateRouteLayout";
import PublicLayout from "./PublicRouteLayout";

const RouteLayout = () => {
  return (
    <BrowserRouter>
      {/* Fires $pageview to PostHog on every route transition */}
      <PageviewTracker />
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path={ROUTES.LOGIN} element={<Login />} />
          <Route path={ROUTES.IMPERSONATE} element={<ImpersonateHandler />} />
          <Route path={ROUTES.HEALTH} element={<Health />} />
          <Route path={ROUTES.MAGIC_VERIFY} element={<MagicLinkVerify />} />
          {/* Legal pages — public, accessible whether or not signed in */}
          <Route path={ROUTES.TERMS} element={<Terms />} />
          <Route path={ROUTES.PRIVACY} element={<Privacy />} />
          {/* Blog — public, accessible whether or not signed in */}
          <Route path={ROUTES.BLOG} element={<Blog />} />
          <Route path={ROUTES.BLOG_POST} element={<BlogPost />} />
          <Route path={ROUTES.CHANGELOG} element={<Changelog />} />
          {/* Standalone situational-judgement self-check — no nav, no sign-in */}
          <Route path={ROUTES.SJT1} element={<Sjt1 />} />
        </Route>

        {/* Hybrid routes - routes which are public but have navbar upon login */}
        <Route element={<HybridRouteLayout />}>
          <Route path={ROUTES.LEARN} element={<Learn />} />
          <Route path={ROUTES.SCENARIO} element={<Scenario />} />
          <Route path={ROUTES.PATHWAY} element={<CaseTrackDetails type="track" />} />
          <Route path={ROUTES.CASE} element={<CaseTrackDetails type="case" />} />
          {/* Track 2.0 (multi-component learning tracks) */}
          <Route path={ROUTES.TRACK} element={<TrackOverview />} />
          <Route path={ROUTES.TRACK_ITEM} element={<TrackPlayer />} />
        </Route>

        {/* Private Routes */}
        <Route path="/*" element={<PrivateRouteLayout />} />
        <Route path={ROUTES.SUSPENDED_USER} element={<SuspendedUser />} />
      </Routes>
    </BrowserRouter>
  );
};

export default RouteLayout;
