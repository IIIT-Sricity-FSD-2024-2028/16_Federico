'use strict';

import { createContext } from 'react';

/**
 * The session context object, kept apart from <SessionProvider> so that
 * SessionContext.jsx only exports components (React Fast Refresh needs that).
 * Read it through useSession().
 */
export const SessionContext = createContext(null);
