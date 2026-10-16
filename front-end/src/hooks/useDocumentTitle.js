'use strict';

import { useEffect } from 'react';

/**
 * Restores the per-page <title> each legacy HTML file carried. index.html has a
 * single static title, so without this every route would read "Federico".
 * Titles are copied verbatim from the original <title> elements.
 */
export function useDocumentTitle(title) {
  useEffect(() => {
    if (!title) return undefined;
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
