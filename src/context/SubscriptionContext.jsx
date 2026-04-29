import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import students from '../api/api';
import { AuthContext } from './AuthContext';

export const SubscriptionContext = createContext();

export const SubscriptionProvider = ({ children }) => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);

  const fetchSubscription = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setPricing(null);
      return;
    }
    try {
      setLoading(true);
      const res = await students.get('dashboard/');
      if (res.data?.pricing) {
        setPricing(res.data.pricing);
      }
    } catch (err) {
      console.error('Failed to fetch subscription status', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchSubscription();
    // Refresh every 10 minutes if authenticated
    const interval = setInterval(() => {
      if (isAuthenticated) fetchSubscription();
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchSubscription, isAuthenticated]);

  const updateSubscription = useCallback(async (formData) => {
    try {
      setLoading(true);
      const res = await students.post('pricing/update/', formData);
      setPricing(res.data.pricing);
      return res.data;
    } catch (err) {
      console.error('Failed to update subscription', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const isLocked = pricing && !pricing.is_paid && pricing.remaining_trial_days <= 0;

  const value = {
    pricing,
    isLocked,
    loading,
    showPricingModal,
    setShowPricingModal,
    updateSubscription,
    refreshSubscription: fetchSubscription
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
