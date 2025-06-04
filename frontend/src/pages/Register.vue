<template>
  <div class="register-container">
    <div class="register-card">
      <h2 class="register-title">Create Account</h2>
      
      <!-- Google Sign-up Button -->
      <button @click="signUpWithGoogle" class="google-signup-button" :disabled="isLoading">
        <svg class="google-icon" viewBox="0 0 24 24" width="20" height="20">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {{ isGoogleLoading ? 'Signing up...' : 'Sign up with Google' }}
      </button>

      <!-- Divider -->
      <div class="divider">
        <span class="divider-text">OR</span>
      </div>

      <!-- Email Registration Form -->
      <form @submit.prevent="register" class="register-form">
        <div class="input-group">
          <input 
            v-model="email" 
            type="email" 
            placeholder="Email" 
            required 
            :disabled="isLoading"
            class="form-input"
          />
        </div>
        
        <div class="input-group">
          <input 
            v-model="password" 
            type="password" 
            placeholder="Password" 
            required 
            :disabled="isLoading"
            class="form-input"
            minlength="6"
          />
        </div>
        
        <div class="input-group">
          <input 
            v-model="confirmPassword" 
            type="password" 
            placeholder="Confirm Password" 
            required 
            :disabled="isLoading"
            class="form-input"
            minlength="6"
          />
        </div>

        <button type="submit" class="register-button" :disabled="isLoading || isGoogleLoading">
          <span v-if="isLoading" class="loading-spinner"></span>
          {{ isLoading ? 'Creating Account...' : 'Create Account' }}
        </button>
      </form>

      <!-- Message Display -->
      <div v-if="message" class="message" :class="messageType">
        {{ message }}
      </div>

      <p class="login-redirect">
        Already have an account?
        <router-link to="/" class="login-link">Sign In</router-link>
      </p>
    </div>
  </div>
</template>

<script>
import axios from '../utils/axios';

export default {
  name: 'RegisterPage',
  data() {
    return {
      email: '',
      password: '',
      confirmPassword: '',
      message: '',
      messageType: '',
      isLoading: false,
      isGoogleLoading: false,
      googleInitialized: false
    };
  },
  mounted() {
    this.loadGoogleSignInAPI();
  },
  methods: {
    async loadGoogleSignInAPI() {
      try {
        // Check if Google API is already loaded
        if (window.google?.accounts?.id) {
          this.initializeGoogleSignIn();
          return;
        }

        // Load Google Identity Services API
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
          // Wait a bit for the API to be fully available
          setTimeout(() => {
            this.initializeGoogleSignIn();
          }, 100);
        };
        
        script.onerror = () => {
          console.error('Failed to load Google Sign-In API');
          this.showMessage('Failed to load Google Sign-In. Please check your internet connection.', 'error');
        };
        
        document.head.appendChild(script);
      } catch (error) {
        console.error('Error loading Google API:', error);
        this.showMessage('Error loading Google Sign-In API', 'error');
      }
    },

    initializeGoogleSignIn() {
      try {
        if (!window.google?.accounts?.id) {
          console.error('Google API not available');
          return;
        }

        window.google.accounts.id.initialize({
          client_id: '1097948787616-rs4h2ai6vpdncqa36gtp1m01klkmarcr.apps.googleusercontent.com',
          callback: this.handleGoogleSignUp,
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: false
        });
        
        this.googleInitialized = true;
        console.log('Google Sign-In initialized successfully');
      } catch (error) {
        console.error('Error initializing Google Sign-In:', error);
        this.showMessage('Error initializing Google Sign-In', 'error');
      }
    },

    async signUpWithGoogle() {
      if (!this.googleInitialized || !window.google?.accounts?.id) {
        this.showMessage('Google Sign-In is not available. Please try again later.', 'error');
        return;
      }

      try {
        this.isGoogleLoading = true;
        this.clearMessage();

        // Use the prompt method to show Google sign-in
        window.google.accounts.id.prompt((notification) => {
          console.log('Google prompt notification:', notification);
          
          if (notification.isNotDisplayed()) {
            console.log('Google One Tap not displayed, trying alternative method');
            // If One Tap doesn't show, you might want to implement a fallback
            this.showMessage('Please allow popups for Google Sign-In or try the email registration.', 'warning');
          }
          
          if (notification.isSkippedMoment()) {
            console.log('Google One Tap was skipped');
          }
          
          this.isGoogleLoading = false;
        });
        
      } catch (error) {
        console.error('Google sign-up error:', error);
        this.showMessage('Google Sign-In failed. Please try again.', 'error');
        this.isGoogleLoading = false;
      }
    },

    async handleGoogleSignUp(response) {
      try {
        this.isGoogleLoading = true;
        this.clearMessage();

        console.log('Google response received:', !!response.credential);

        // Send the Google credential token to your backend
        const res = await axios.post('/auth/google', {
          credential: response.credential
        });

        if (res.data.token) {
          // Store the token
          localStorage.setItem('token', res.data.token);
          
          // Store user info if available
          if (res.data.user) {
            localStorage.setItem('user', JSON.stringify(res.data.user));
          }
          
          this.showMessage(res.data.message || 'Account created successfully with Google!', 'success');

          // Redirect to dashboard/chargers page
          setTimeout(() => {
            this.$router.push('/chargers');
          }, 1500);
        } else {
          throw new Error('No token received from server');
        }
      } catch (err) {
        console.error('Google sign-up error:', err);
        const errorMessage = err.response?.data?.message || 'Google sign-up failed. Please try again.';
        this.showMessage(errorMessage, 'error');
      } finally {
        this.isGoogleLoading = false;
      }
    },

    async register() {
      // Validation
      if (!this.validateForm()) {
        return;
      }

      try {
        this.isLoading = true;
        this.clearMessage();

        const res = await axios.post('/auth/register', {
          email: this.email.trim(),
          password: this.password
        });

        this.showMessage(res.data.message || 'Account created successfully!', 'success');

        // Clear form
        this.resetForm();

        // Redirect to login after short delay
        setTimeout(() => {
          this.$router.push('/');
        }, 2000);
        
      } catch (err) {
        console.error('Registration error:', err);
        const errorMessage = err.response?.data?.message || 'Registration failed. Please try again.';
        this.showMessage(errorMessage, 'error');
      } finally {
        this.isLoading = false;
      }
    },

    validateForm() {
      if (!this.email.trim()) {
        this.showMessage('Email is required.', 'error');
        return false;
      }

      if (!this.isValidEmail(this.email)) {
        this.showMessage('Please enter a valid email address.', 'error');
        return false;
      }

      if (this.password.length < 6) {
        this.showMessage('Password must be at least 6 characters long.', 'error');
        return false;
      }

      if (this.password !== this.confirmPassword) {
        this.showMessage('Passwords do not match.', 'error');
        return false;
      }

      return true;
    },

    isValidEmail(email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    },

    showMessage(text, type) {
      this.message = text;
      this.messageType = type;
      
      // Auto-clear success messages after 5 seconds
      if (type === 'success') {
        setTimeout(() => {
          this.clearMessage();
        }, 5000);
      }
    },

    clearMessage() {
      this.message = '';
      this.messageType = '';
    },

    resetForm() {
      this.email = '';
      this.password = '';
      this.confirmPassword = '';
    }
  },

  beforeUnmount() {
    // Clean up if needed
    this.clearMessage();
  }
};
</script>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
}

.register-card {
  width: 100%;
  max-width: 450px;
  background-color: #ffffff;
  padding: 40px 30px;
  border-radius: 16px;
  box-sizing: border-box;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  animation: fade-in 0.6s ease-out;
}

.register-title {
  font-size: 32px;
  font-weight: 700;
  text-align: center;
  color: #1f2937;
  margin-bottom: 30px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.google-signup-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px 24px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  background-color: #ffffff;
  color: #374151;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 20px;
}

.google-signup-button:hover:not(:disabled) {
  border-color: #d1d5db;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.google-signup-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.google-icon {
  flex-shrink: 0;
}

.divider {
  position: relative;
  text-align: center;
  margin: 24px 0;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background-color: #e5e7eb;
}

.divider-text {
  background-color: #ffffff;
  color: #9ca3af;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 500;
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-group {
  display: flex;
  flex-direction: column;
}

.form-input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 16px;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: #667eea;
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  transform: translateY(-2px);
}

.form-input:disabled {
  background-color: #f9fafb;
  cursor: not-allowed;
  opacity: 0.6;
}

.register-button {
  width: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 14px;
  font-weight: 600;
  font-size: 16px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.register-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.register-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #ffffff;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.message {
  font-size: 14px;
  margin-top: 16px;
  text-align: center;
  padding: 12px;
  border-radius: 8px;
  font-weight: 500;
}

.message.success {
  color: #16a34a;
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
}

.message.error {
  color: #dc2626;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
}

.message.warning {
  color: #d97706;
  background-color: #fffbeb;
  border: 1px solid #fde68a;
}

.login-redirect {
  text-align: center;
  font-size: 14px;
  color: #6b7280;
  margin-top: 24px;
}

.login-link {
  color: #667eea;
  font-weight: 600;
  text-decoration: none;
  transition: color 0.3s ease;
  margin-left: 5px;
}

.login-link:hover {
  text-decoration: underline;
  color: #5a67d8;
}

/* Mobile responsiveness */
@media (max-width: 480px) {
  .register-card {
    padding: 30px 20px;
    margin: 10px;
  }
  
  .register-title {
    font-size: 28px;
  }
  
  .google-signup-button,
  .form-input,
  .register-button {
    font-size: 15px;
  }
}
</style>