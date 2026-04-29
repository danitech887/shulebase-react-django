import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { MessageProvider } from './context/MessageContext';
import AppRoutes from './routes/AppRoutes';

import { SubscriptionProvider } from './context/SubscriptionContext';

export default function App() {
  return (
    <AuthProvider>
      <MessageProvider>
        <SubscriptionProvider>
          <AppRoutes />
        </SubscriptionProvider>
      </MessageProvider>
    </AuthProvider>
  );
}
