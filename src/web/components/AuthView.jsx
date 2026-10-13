import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft, 
  KeyRound,
  AlertTriangle,
  Info,
  Check,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthView({ initialMode = 'login', onSuccess, initialToken = null, onSwitchMode }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register' | 'forgot' | 'reset'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState(initialToken || '');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Recovery token verification state
  const [tokenVerification, setTokenVerification] = useState({ 
    status: 'idle', // 'idle' | 'checking' | 'success' | 'error'
    valid: null, 
    userEmail: null, 
    message: '' 
  });

  const { login, register, forgotPassword, resetPassword, verifyRecoveryToken, setAuthError } = useAuth();

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  useEffect(() => {
    if (initialToken) {
      setToken(initialToken);
    }
  }, [initialToken]);

  // Proactively verify recovery token when in reset mode
  useEffect(() => {
    let isMounted = true;
    async function checkToken() {
      if (mode === 'reset' && token) {
        setTokenVerification({ status: 'checking', valid: null, userEmail: null, message: '' });
        try {
          const res = await verifyRecoveryToken(token);
          if (!isMounted) return;
          if (res.valid) {
            setTokenVerification({
              status: 'success',
              valid: true,
              userEmail: res.user?.email || res.email || null,
              message: ''
            });
          } else {
            setTokenVerification({
              status: 'error',
              valid: false,
              userEmail: null,
              message: res.message || 'The password reset link is invalid or has expired.'
            });
          }
        } catch (e) {
          if (!isMounted) return;
          setTokenVerification({
            status: 'error',
            valid: false,
            userEmail: null,
            message: 'Unable to verify recovery link with server.'
          });
        }
      }
    }

    checkToken();
    return () => { isMounted = false; };
  }, [mode, token]);

  const handleTabSwitch = (newMode) => {
    const targetMode = newMode === 'forgot' ? 'reset' : newMode;
    setMode(targetMode);
    setFieldErrors({});
    setGeneralError('');
    setSuccessMessage('');
    setAuthError(null);

    // Sync hash for clean URL experience
    if (targetMode === 'reset') {
      window.location.hash = 'reset-password';
    } else if (targetMode === 'login') {
      window.location.hash = 'login';
    } else if (targetMode === 'register') {
      window.location.hash = 'register';
    }

    if (onSwitchMode) onSwitchMode(targetMode);
  };

  // Client-side password strength calculator: Weak, Fair, Good, Strong
  const calculatePasswordStrength = (pass) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Za-z]/.test(pass) && /[0-9]/.test(pass)) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass) || pass.length >= 12) score++;
    return Math.min(4, Math.max(1, score));
  };

  const strengthScore = calculatePasswordStrength(password);
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError('');
    setSuccessMessage('');

    if (mode === 'register') {
      setIsSubmitting(true);
      const result = await register({ name, email, password });
      setIsSubmitting(false);

      if (result.success) {
        if (onSuccess) onSuccess();
      } else {
        setGeneralError(result.message);
        setFieldErrors(result.errors || {});
      }
    } else if (mode === 'login') {
      setIsSubmitting(true);
      const result = await login({ email, password });
      setIsSubmitting(false);

      if (result.success) {
        if (onSuccess) onSuccess();
      } else {
        setGeneralError(result.message);
        setFieldErrors(result.errors || {});
      }
    } else if (mode === 'forgot') {
      if (!email.trim()) {
        setFieldErrors({ email: 'Please enter your account email address.' });
        return;
      }

      setIsSubmitting(true);
      const result = await forgotPassword({ email: email.trim() });
      setIsSubmitting(false);

      if (result.success) {
        setSuccessMessage(result.message || 'If an account exists for that email, a password reset link has been sent. Please check your inbox.');
      } else {
        setGeneralError(result.message);
        setFieldErrors(result.errors || {});
      }
    } else if (mode === 'reset') {
      const errors = {};
      if (!password) {
        errors.password = 'Password is required';
      } else if (password.length < 8) {
        errors.password = 'Password must be at least 8 characters long';
      } else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        errors.password = 'Password must contain at least one letter and one number';
      }

      if (!confirmPassword) {
        errors.confirmPassword = 'Please confirm your password';
      } else if (password !== confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }

      const activeToken = token.trim();
      const activeEmail = email.trim();

      // If no recovery token or code in session/URL:
      if (!activeToken) {
        if (!activeEmail) {
          setFieldErrors({ email: 'Please enter your account email address' });
          return;
        }

        // Send recovery verification email for ownership
        setIsSubmitting(true);
        const forgotRes = await forgotPassword({ email: activeEmail });
        setIsSubmitting(false);

        if (forgotRes.success) {
          setGeneralError('');
          setSuccessMessage(`To verify account ownership, Supabase sent a recovery authorization link to ${activeEmail}. Check your inbox and click the link or paste your recovery code to update your password.`);
        } else {
          setGeneralError(forgotRes.message || 'Unable to initiate recovery authorization for this account.');
        }
        return;
      }

      setIsSubmitting(true);
      const result = await resetPassword({ password, token: activeToken, email: activeEmail });
      setIsSubmitting(false);

      if (result.success) {
        setSuccessMessage('Password updated successfully');
        setPassword('');
        setConfirmPassword('');
      } else {
        setGeneralError(result.message);
        setFieldErrors(result.errors || {});
      }
    }
  };

  return (
    <div className="auth-card-container">
      <div className="auth-card">
        {/* Card Header */}
        <div className="auth-header">
          <div className="auth-icon-circle">
            {mode === 'forgot' ? (
              <Mail size={22} className="auth-lock-icon" />
            ) : mode === 'reset' ? (
              <KeyRound size={22} className="auth-lock-icon" />
            ) : (
              <Lock size={22} className="auth-lock-icon" />
            )}
          </div>
          <h2 className="auth-title">
            {mode === 'login' && 'Welcome Back to AutoDox'}
            {mode === 'register' && 'Create AutoDox Account'}
            {mode === 'forgot' && 'Reset Your Password'}
            {mode === 'reset' && 'Set New Password'}
          </h2>
          <p className="auth-subtitle">
            {mode === 'login' && 'Access your centralized vault and synchronize with the Chrome extension.'}
            {mode === 'register' && 'Register to manage multiple profiles, personal attributes, and cloud autofill.'}
            {mode === 'forgot' && 'Enter your registered email address to receive a secure Supabase password recovery link.'}
            {mode === 'reset' && (tokenVerification.userEmail 
              ? `Enter and confirm a new strong password for ${tokenVerification.userEmail}` 
              : 'Choose a strong new password for your AutoDox account.')}
          </p>
        </div>

        {/* Tab Switcher (Only on login / register) */}
        {(mode === 'login' || mode === 'register') && (
          <div className="auth-tab-pills">
            <button 
              type="button"
              className={`auth-tab-pill ${mode === 'login' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('login')}
            >
              Sign In
            </button>
            <button 
              type="button"
              className={`auth-tab-pill ${mode === 'register' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('register')}
            >
              Create Account
            </button>
          </div>
        )}

        {/* General Error Banner */}
        {generalError && (
          <div className="alert-banner error">
            <AlertCircle size={16} className="alert-icon" />
            <div className="alert-content">
              <span>{generalError}</span>
            </div>
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div className="alert-banner success">
            <CheckCircle2 size={16} className="alert-icon" />
            <div className="alert-content">
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {/* Expired / Invalid Recovery Token Screen */}
        {mode === 'reset' && tokenVerification.status === 'error' ? (
          <div className="recovery-invalid-card">
            <div className="recovery-invalid-icon-wrap">
              <AlertTriangle size={32} className="text-amber" />
            </div>
            <h3 className="recovery-invalid-title">Recovery Link Expired or Invalid</h3>
            <p className="recovery-invalid-text">
              {tokenVerification.message || 'This password reset link has already been used or has expired. Supabase password recovery links are single-use for your security.'}
            </p>
            <div className="recovery-invalid-actions">
              <button 
                type="button" 
                className="btn-auth-submit"
                onClick={() => handleTabSwitch('forgot')}
              >
                <span>Request a New Reset Link</span>
                <ArrowRight size={16} />
              </button>
              <button 
                type="button" 
                className="btn-link-back"
                onClick={() => handleTabSwitch('login')}
              >
                <ArrowLeft size={14} /> Back to Sign In
              </button>
            </div>
          </div>
        ) : mode === 'reset' && tokenVerification.status === 'checking' ? (
          <div className="recovery-checking-card">
            <RefreshCw size={24} className="spin-icon text-cyan" />
            <span>Verifying recovery link with Supabase Auth...</span>
          </div>
        ) : successMessage && (mode === 'forgot' || mode === 'reset') ? (
          /* Success state post-submission */
          <div className="auth-success-box">
            <div className="success-icon-badge">
              <CheckCircle2 size={24} className="text-emerald" />
            </div>
            <h4 className="success-box-title">
              {mode === 'forgot' ? 'Check Your Inbox' : 'Password updated successfully'}
            </h4>
            <p className="success-box-text">
              {mode === 'forgot' 
                ? 'If an account is associated with that email, Supabase has sent a recovery link. Check your inbox and spam folder, then click the link to reset your password.' 
                : 'Your password has been changed. You can now sign in with your new credentials.'}
            </p>
            <button 
              type="button" 
              className="btn-auth-submit"
              onClick={() => handleTabSwitch('login')}
            >
              <span>{mode === 'forgot' ? 'Return to Sign In' : 'Return to Login'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          /* Form Content */
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {/* Name Field (Register only) */}
            {mode === 'register' && (
              <div className={`form-field-group ${fieldErrors.name ? 'has-error' : ''}`}>
                <label htmlFor="reg-name" className="field-label">
                  Full Name
                </label>
                <div className="input-wrap">
                  <User size={16} className="input-icon" />
                  <input 
                    type="text"
                    id="reg-name"
                    placeholder="e.g. Alex Morgan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                {fieldErrors.name && (
                  <span className="field-error-text">{fieldErrors.name}</span>
                )}
              </div>
            )}

            {/* Email Field (Login, Register, Forgot) */}
            {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
              <div className={`form-field-group ${fieldErrors.email ? 'has-error' : ''}`}>
                <label htmlFor="auth-email" className="field-label">
                  Email Address
                </label>
                <div className="input-wrap">
                  <Mail size={16} className="input-icon" />
                  <input 
                    type="email"
                    id="auth-email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                {fieldErrors.email && (
                  <span className="field-error-text">{fieldErrors.email}</span>
                )}
              </div>
            )}

            {/* Password Field (Login & Register) */}
            {(mode === 'login' || mode === 'register') && (
              <div className={`form-field-group ${fieldErrors.password ? 'has-error' : ''}`}>
                <div className="label-row-split">
                  <label htmlFor="auth-password" className="field-label">
                    Password
                  </label>
                  {mode === 'register' && (
                    <span className="password-hint">Min 8 chars, 1 letter & 1 number</span>
                  )}
                </div>
                <div className="input-wrap">
                  <Lock size={16} className="input-icon" />
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    id="auth-password"
                    placeholder={mode === 'register' ? 'Choose a strong password' : 'Enter your password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    required
                  />
                  <button 
                    type="button" 
                    className="btn-toggle-eye"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <span className="field-error-text">{fieldErrors.password}</span>
                )}

                {/* Visible "Forgot Password?" link below password field on login page */}
                {mode === 'login' && (
                  <div className="forgot-password-link-wrap">
                    <button 
                      type="button" 
                      className="btn-link-forgot"
                      onClick={() => handleTabSwitch('reset')}
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}

                {/* Password Strength Meter (Register only) */}
                {mode === 'register' && password.length > 0 && (
                  <div className="strength-meter-wrap">
                    <div className="meter-bars">
                      {[1, 2, 3, 4].map((step) => (
                        <div 
                          key={step} 
                          className="meter-bar-segment"
                          style={{
                            backgroundColor: step <= strengthScore ? strengthColors[strengthScore - 1] : '#334155'
                          }}
                        />
                      ))}
                    </div>
                    <span 
                      className="meter-text"
                      style={{ color: strengthScore > 0 ? strengthColors[strengthScore - 1] : '#94a3b8' }}
                    >
                      {strengthScore > 0 ? strengthLabels[strengthScore - 1] : 'Too Short'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Reset Password Form Fields (Reset mode) */}
            {mode === 'reset' && (
              <>
                {/* Account Email (Shown if not yet verified by email session) */}
                {!tokenVerification.userEmail && (
                  <div className={`form-field-group ${fieldErrors.email ? 'has-error' : ''}`}>
                    <label htmlFor="reset-email" className="field-label">
                      Account Email Address
                    </label>
                    <div className="input-wrap">
                      <Mail size={16} className="input-icon" />
                      <input 
                        type="email"
                        id="reset-email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        required
                      />
                    </div>
                    {fieldErrors.email && (
                      <span className="field-error-text">{fieldErrors.email}</span>
                    )}
                  </div>
                )}

                {/* If session already verified */}
                {tokenVerification.userEmail && (
                  <div className="verified-session-badge">
                    <CheckCircle2 size={15} className="text-emerald" />
                    <span>Verified Recovery Session for <strong>{tokenVerification.userEmail}</strong></span>
                  </div>
                )}

                {/* Optional Recovery Code / Token input if not verified from URL link */}
                {!tokenVerification.valid && (
                  <div className={`form-field-group ${fieldErrors.token ? 'has-error' : ''}`}>
                    <div className="label-row-split">
                      <label htmlFor="reset-token" className="field-label">
                        Recovery Code / Token
                      </label>
                      <button 
                        type="button" 
                        className="btn-link-action"
                        onClick={async () => {
                          if (!email.trim()) {
                            setFieldErrors({ email: 'Please enter your email above to receive a code' });
                            return;
                          }
                          setIsSubmitting(true);
                          const res = await forgotPassword({ email: email.trim() });
                          setIsSubmitting(false);
                          if (res.success) {
                            setGeneralError('');
                            setSuccessMessage(`Recovery link/code dispatched to ${email.trim()}.`);
                          } else {
                            setGeneralError(res.message);
                          }
                        }}
                      >
                        Send Code to Email
                      </button>
                    </div>
                    <div className="input-wrap">
                      <KeyRound size={16} className="input-icon" />
                      <input 
                        type="text"
                        id="reset-token"
                        placeholder="Enter recovery code or token from email"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                      />
                    </div>
                    {fieldErrors.token && (
                      <span className="field-error-text">{fieldErrors.token}</span>
                    )}
                  </div>
                )}

                {/* New Password Field */}
                <div className={`form-field-group ${fieldErrors.password ? 'has-error' : ''}`}>
                  <div className="label-row-split">
                    <label htmlFor="new-password" className="field-label">
                      New Password
                    </label>
                    <span className="password-hint">Min 8 chars, 1 letter & 1 number</span>
                  </div>
                  <div className="input-wrap">
                    <Lock size={16} className="input-icon" />
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      id="new-password"
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                    <button 
                      type="button" 
                      className="btn-toggle-eye"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <span className="field-error-text">{fieldErrors.password}</span>
                  )}

                  {/* Live Password Strength Meter: Weak, Fair, Good, Strong */}
                  {password.length > 0 && (
                    <div className="strength-meter-wrap">
                      <div className="meter-bars">
                        {[1, 2, 3, 4].map((step) => (
                          <div 
                            key={step} 
                            className="meter-bar-segment"
                            style={{
                              backgroundColor: step <= strengthScore ? strengthColors[strengthScore - 1] : '#334155'
                            }}
                          />
                        ))}
                      </div>
                      <span 
                        className="meter-text"
                        style={{ color: strengthScore > 0 ? strengthColors[strengthScore - 1] : '#94a3b8' }}
                      >
                        {strengthScore > 0 ? strengthLabels[strengthScore - 1] : 'Weak'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div className={`form-field-group ${fieldErrors.confirmPassword ? 'has-error' : ''}`}>
                  <div className="label-row-split">
                    <label htmlFor="confirm-password" className="field-label">
                      Confirm Password
                    </label>
                    {confirmPassword && password && (
                      <span className={`match-badge ${confirmPassword === password ? 'match-ok' : 'match-no'}`}>
                        {confirmPassword === password ? '✓ Passwords Match' : '✗ Passwords Do Not Match'}
                      </span>
                    )}
                  </div>
                  <div className="input-wrap">
                    <Lock size={16} className="input-icon" />
                    <input 
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirm-password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                    <button 
                      type="button" 
                      className="btn-toggle-eye"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <span className="field-error-text">{fieldErrors.confirmPassword}</span>
                  )}
                </div>
              </>
            )}

            {/* Informational Guidance for Forgot Password */}
            {mode === 'forgot' && (
              <div className="auth-info-note">
                <Info size={14} className="info-note-icon text-cyan" />
                <p>
                  <strong>How it works:</strong> We use Supabase Auth's official password recovery service. If your email is registered, you'll receive a secure single-use recovery link.
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit" 
              className="btn-auth-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="btn-spinner-text">
                  <span className="spinner-dot" /> Processing...
                </span>
              ) : (
                <>
                  <span>
                    {mode === 'login' && 'Sign In to Dashboard'}
                    {mode === 'register' && 'Create Free Account'}
                    {mode === 'forgot' && 'Send Reset Link'}
                    {mode === 'reset' && 'Update Password'}
                  </span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* Back to Sign In button for forgot & reset modes */}
            {(mode === 'forgot' || mode === 'reset') && (
              <button
                type="button"
                className="btn-link-back"
                onClick={() => handleTabSwitch('login')}
              >
                <ArrowLeft size={14} /> Back to Sign In
              </button>
            )}
          </form>
        )}

        {/* Card Footer */}
        <div className="auth-footer-notice">
          <ShieldCheck size={14} className="security-shield-icon" />
          <span>
            Secured by <strong>Supabase Auth & Row Level Security</strong>. Passwords and sessions are fully encrypted.
          </span>
        </div>
      </div>
    </div>
  );
}
