import { FC, useEffect, useRef, useState } from "react";

import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import Drawer from "@components/drawer";
import { ArticleResource } from "@types";

interface ExternalResourceModalProps {
  resource: ArticleResource;
  onClose: () => void;
}

/**
 * A cross-origin iframe never tells the parent page *why* it failed — same-
 * origin policy blocks reading its content, so a destination that shows a
 * bot/CAPTCHA challenge (common once a site's WAF notices the embed's
 * cookie-less, iframe-flavoured request) looks identical, from here, to one
 * that loaded fine. The one thing that IS observable is whether `onLoad`
 * ever fires at all, so that's the only condition this auto-falls-back on.
 */
const EMBED_TIMEOUT_MS = 8000;

export const openInNewTab = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

/**
 * In-place view of a trainer-curated external resource, opened from an
 * article's Resources list. Embeds the page in an iframe so the learner
 * never leaves the course — but many real sites (Wikipedia, most news sites,
 * many docs) block iframe embedding via X-Frame-Options/CSP, and some trigger
 * a bot-check challenge once embedded that wouldn't appear in a normal tab.
 * A frame stuck on neither succeeds nor errors from the parent's point of
 * view, so after a short wait this gives up on the embed and opens the link
 * normally instead of leaving the learner staring at a stalled frame. A site
 * that loads *something* inside the window (including a challenge page) still
 * counts as "loaded" here — that failure mode genuinely cannot be told apart
 * from a real page load without reading cross-origin content, which the
 * browser never allows — so the "open in a new tab" action stays visible at
 * all times as the manual way out of that case specifically.
 */
export const ExternalResourceModal: FC<ExternalResourceModalProps> = ({ resource, onClose }) => {
  const { t } = useTranslation();
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      toast.info(t("tracks2.article.embedTimedOut"));
      openInNewTab(resource.url);
      onClose();
    }, EMBED_TIMEOUT_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // Intentionally only re-arms if the resource itself changes — `onClose`
    // and `t` are stable enough in practice that re-running this per render
    // would just restart the countdown on every unrelated re-render.
  }, [resource.url]);

  const handleLoad = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLoaded(true);
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={resource.title}
      drawerClassName="w-[92vw] max-w-[1100px]"
      bodyClassName="h-full"
      headerButtons={[
        {
          alt: "open-in-new-tab",
          text: t("tracks2.article.openInNewTab"),
          icon: <span className="text-xs font-medium">{t("tracks2.article.openInNewTab")}</span>,
          onClick: () => openInNewTab(resource.url),
          show: true,
        },
      ]}
    >
      <div className="relative h-full w-full">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-500" />
          </div>
        )}
        <iframe
          src={resource.url}
          title={resource.title}
          className="h-full w-full border-0"
          onLoad={handleLoad}
        />
      </div>
    </Drawer>
  );
};
