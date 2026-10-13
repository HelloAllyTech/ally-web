import { FC, useEffect } from "react";

import { ArticleResource } from "@types";

const openInNewTab = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

interface ExternalResourceModalProps {
  resource: ArticleResource;
  onClose: () => void;
}

/**
 * In-place view of a trainer-curated external resource, opened from an
 * article's Resources list. This component now directly opens the resource
 * in a new tab to prevent issues with sites that block iframe embedding.
 */
export const ExternalResourceModal: FC<ExternalResourceModalProps> = ({ resource, onClose }) => {
  useEffect(() => {
    openInNewTab(resource.url);
    onClose();
  }, [resource, onClose]);

  return null;
};
