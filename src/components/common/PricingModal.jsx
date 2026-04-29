import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { SubscriptionContext } from '../../context/SubscriptionContext';
import { AuthContext } from '../../context/AuthContext';
import { useMessage } from '../../context/MessageContext';
import './PricingModal.css';

export default function PricingModal() {
  const navigate = useNavigate();
  const { showMessage } = useMessage();
  const { logout, user } = useContext(AuthContext);
  const isAdmin = ['admin', 'systemowner'].includes(user?.role?.toLowerCase());
  const { 
    pricing, 
    isLocked, 
    loading, 
    showPricingModal, 
    setShowPricingModal, 
    updateSubscription,
    refreshSubscription
  } = useContext(SubscriptionContext);

  const [pricingForm, setPricingForm] = useState({
    plan_name: '',
    billing_cycle: '',
    transaction_code: ''
  });
  const [localLoading, setLocalLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (pricing && (!hasInitialized || !isEditing)) {
      setPricingForm({
        plan_name: pricing.plan_name || 'Starter',
        billing_cycle: pricing.billing_cycle || 'Monthly',
        transaction_code: pricing.transaction_code || ''
      });
      setHasInitialized(true);
      // If we just fetched a new status that isn't under_review, stop editing
      if (pricing.payment_status !== 'under_review') {
        setIsEditing(false);
      }
    }
  }, [pricing, isEditing, hasInitialized]);

  const handleUpdatePricing = async () => {
    if (!pricingForm.plan_name || !pricingForm.billing_cycle || !pricingForm.transaction_code) {
      showMessage({ type: 'error', text: "Please select a plan, billing cycle, and enter your transaction code." });
      return;
    }
    try {
      setLocalLoading(true);
      await updateSubscription(pricingForm);
      setIsEditing(false);
      showMessage({ type: 'success', text: "Payment information submitted successfully!" });
    } catch (err) {
      showMessage({ type: 'error', text: "Failed to update pricing info. Please try again." });
    } finally {
      setLocalLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setShowPricingModal(false);
    navigate('/login');
  };

  const showModal = showPricingModal || isLocked;
  const [timeLeft, setTimeLeft] = useState(60);
  const [showPricingDetails, setShowPricingDetails] = useState(false);

  useEffect(() => {
    let timer;
    if (isLocked && !isAdmin && showModal) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isLocked, isAdmin, showModal]);

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [showModal]);

  if (!showModal) return null;

  return (
    <div className="db-modal-overlay" onClick={() => !isLocked && setShowPricingModal(false)}>
      <div className="db-modal-card" onClick={e => e.stopPropagation()}>
        <div className="db-modal-header">
          <h2 className="db-modal-title">
            {isLocked ? (isAdmin ? '🔒 Trial Expired' : '🛑 System Inactive') : 'Upgrade Subscription'}
          </h2>
          <div className="d-flex gap-2 align-items-center">
            <button className="db-btn-upgrade-small" onClick={() => setShowPricingDetails(!showPricingDetails)}>
              {showPricingDetails ? 'Hide Pricing' : 'Upgrade Plan 💎'}
            </button>
            <button className="db-btn-logout-small" onClick={handleLogout} title="Logout"> Logout 🚪</button>
            {!isLocked && <button className="db-modal-close" onClick={() => setShowPricingModal(false)}>×</button>}
          </div>
        </div>
        
        <div className="db-modal-body">
          {isLocked ? (
            <div className="db-lock-alert mb-4">
              <div className="db-lock-icon">{isAdmin ? '⚠️' : '🚫'}</div>
              <div className="db-lock-text">
                <strong>{isAdmin ? 'Trial Expired:' : 'System Inactive:'}</strong> 
                {isAdmin 
                  ? "Your access to ShuleBase has been suspended. Please select a plan and provide your payment transaction code to restore service."
                  : (
                    <>
                      The school's subscription has expired and the system is currently inactive. Please contact the school administrator to restore service.
                      <div className="mt-2 db-logout-countdown">
                        You will be automatically logged out in <strong>{timeLeft} seconds</strong>.
                      </div>
                    </>
                  )}
              </div>
            </div>
          ) : (
            <p className="db-modal-sub">
              {isAdmin 
                ? "Choose a plan that fits your school's needs and provide your transaction code if you've already paid."
                : "The system is currently active. View current subscription plans."}
            </p>
          )}
          
          {(showPricingDetails || (isAdmin && (pricing?.payment_status !== 'under_review' || isEditing))) && (
            <>
              <div className="db-pricing-toggle-wrap mb-4">
                 <div className="db-pricing-toggle">
                    <button 
                      className={`db-toggle-btn ${pricingForm.billing_cycle === 'Monthly' ? 'active' : ''}`}
                      onClick={() => setPricingForm(f => ({...f, billing_cycle: 'Monthly'}))}
                    >Monthly</button>
                    <button 
                      className={`db-toggle-btn ${pricingForm.billing_cycle === 'Annual' ? 'active' : ''}`}
                      onClick={() => setPricingForm(f => ({...f, billing_cycle: 'Annual'}))}
                    >Annual <span className="save-badge">Save 20%</span></button>
                 </div>
              </div>

              <div className="db-plans-row mb-4">
                {[
                  { id: 'Starter',    icon: '🌱', priceM: '3,500', priceA: '2,800' },
                ].map(plan => (
                  <div 
                    key={plan.id} 
                    className={`db-plan-select ${pricingForm.plan_name === plan.id ? 'active' : ''}`}
                    onClick={() => setPricingForm(f => ({...f, plan_name: plan.id}))}
                  >
                    <div className="db-plan-check">{pricingForm.plan_name === plan.id ? '✅' : '○'}</div>
                    <div className="db-plan-icon">{plan.icon}</div>
                    <div className="db-plan-name">{plan.id}</div>
                    <div className="db-plan-price">
                      <span className="p-curr">KES</span>
                      <span className="p-amt">{pricingForm.billing_cycle === 'Monthly' ? plan.priceM : plan.priceA}</span>
                      <span className="p-per">/mo</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="db-payment-field">
                <label className="db-input-label">Transaction Code (e.g. M-Pesa ID)</label>
                <input 
                  type="text" 
                  className="db-modal-input" 
                  placeholder="Enter your payment reference code..."
                  value={pricingForm.transaction_code}
                  onChange={e => setPricingForm(f => ({...f, transaction_code: e.target.value}))}
                />
              </div>
            </>
          )}

          {isAdmin && pricing?.payment_status === 'under_review' && !isEditing && (
            <div className="db-confirmation-banner mt-2">
              <div className="db-conf-icon">✅</div>
              <div className="db-conf-body">
                <strong>Submission Successful!</strong>
                <p>We've received your transaction code: <strong>{pricing.transaction_code}</strong>.</p>
                <p className="mt-2" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                  Our team is currently verifying your payment. This usually takes a few minutes. 
                  <strong> Please refresh to see if your account has been unlocked.</strong>
                </p>
                <div className="d-flex gap-3 mt-3">
                  <button 
                    className="db-btn-refresh"
                    onClick={() => refreshSubscription()}
                    disabled={loading}
                  >
                    {loading ? 'Checking...' : '🔄 Refresh Status'}
                  </button>
                  <button 
                    className="btn btn-link p-0" 
                    style={{fontSize: '0.75rem', color: '#818cf8', textDecoration: 'none'}}
                    onClick={() => setIsEditing(true)}
                  >
                    ✍️ Edit Code
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        <div className="db-modal-footer">
          {(!isLocked || isEditing) && <button className="db-btn-ghost" onClick={() => { setShowPricingModal(false); setIsEditing(false); }}>{isEditing ? 'Back' : 'Cancel'}</button>}
          {(showPricingDetails || (isAdmin && (pricing?.payment_status !== 'under_review' || isEditing))) && (
            <button 
              className="db-btn-primary w-100" 
              onClick={handleUpdatePricing} 
              disabled={localLoading}
            >
              {localLoading ? 'Processing...' : 'Confirm & Unlock Account'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
