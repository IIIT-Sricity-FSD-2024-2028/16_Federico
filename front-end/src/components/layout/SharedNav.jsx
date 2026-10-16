'use strict';

import AppNavbar from './AppNavbar.jsx';

/**
 * Adapter forwarding to the universal AppNavbar.
 */
export default function SharedNav(props) {
  return <AppNavbar {...props} />;
}
