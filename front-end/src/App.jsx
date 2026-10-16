'use strict';

import { Outlet } from 'react-router-dom';
import FeedbackHost from './components/feedback/FeedbackHost.jsx';

export default function App() {
  return (
    <>
      <Outlet />
      <FeedbackHost />
    </>
  );
}
