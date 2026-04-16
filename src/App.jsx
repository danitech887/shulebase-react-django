import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { MessageProvider } from './context/MessageContext';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <AuthProvider>
      <MessageProvider>
        <AppRoutes />
      </MessageProvider>
    </AuthProvider>
  );
}
