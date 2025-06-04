<template>
  <div class="login-container">
    <div class="login-card">
      <h2>Login</h2>
      <form @submit.prevent="handleLogin" class="login-form">
        <input v-model="email" type="email" placeholder="Email" required autocomplete="username" />
        <input v-model="password" type="password" placeholder="Password" required autocomplete="current-password" />
        <button type="submit" class="btn-login">Login</button>
        <p v-if="error" class="error-message">{{ error }}</p>
      </form>
      
      <div class="divider">
        <span>OR</span>
      </div>
      
      <button @click="handleGoogleLogin" class="btn-google" :disabled="isGoogleLoading">
        <svg v-if="!isGoogleLoading" class="google-icon" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <div v-else class="loading-spinner"></div>
        {{ isGoogleLoading ? 'Signing in...' : 'Sign in with Google' }}
      </button>
      
      <!-- Hidden Google Sign-In button for programmatic trigger -->
      <div id="google-signin-button" style="display: none;"></div>
      
      <p class="register-text">
        Don't have an account?
        <router-link to="/register" class="register-link">Register here</router-link>
      </p>
    </div>
    
    <!-- Registration Prompt Modal -->
    <div v-if="showRegistrationPrompt" class="modal-overlay" @click="closeRegistrationPrompt">
      <div class="modal-content" @click.stop>
        <h3>Account Not Found</h3>
        <p>The email <strong>{{ email }}</strong> is not registered.</p>
        <p>Would you like to create a new account?</p>
        <div class="modal-buttons">
          <button @click="redirectToRegister" class="btn-register">Register Now</button>
          <button @click="closeRegistrationPrompt" class="btn-cancel">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from '../utils/axios';

export default {
  data() {
    return {
      email: '',
      password: '',
      error: '',
      isGoogleLoading: false,
      showRegistrationPrompt: false,
      googleClientId: '1097948787616-rs4h2ai6vpdncqa36gtp1m01klkmarcr.apps.googleusercontent.com'
    };
  },
  computed: {
    clientId() {
      return process.env.VUE_APP_GOOGLE_CLIENT_ID || this.googleClientId;
    }
  },
  mounted() {
    this.initializeGoogleSignIn();
  },
  methods: {
    async handleLogin() {
      try {
        this.error = '';
        const res = await axios.post('/auth/login', {
          email: this.email,
          password: this.password
        });
        localStorage.setItem('token', res.data.token);
        this.$router.push('/chargers');
      } catch (err) {
        const errorMessage = err.response?.data?.message || 'Login failed';
        const statusCode = err.response?.status;
        
        // Check if the error is due to user not being registered
        if (statusCode === 404 || 
            errorMessage.toLowerCase().includes('user not found') ||
            errorMessage.toLowerCase().includes('email not registered') ||
            errorMessage.toLowerCase().includes('account not found')) {
          this.showRegistrationPrompt = true;
        } else {
          this.error = errorMessage;
        }
      }
    },
    
    closeRegistrationPrompt() {
      this.showRegistrationPrompt = false;
    },
    
    redirectToRegister() {
      this.showRegistrationPrompt = false;
      // Pass the email to registration page
      this.$router.push({ 
        path: '/register', 
        query: { email: this.email } 
      });
    },
    
    initializeGoogleSignIn() {
      // Check if client ID is available
      if (!this.clientId) {
        console.error('Google Client ID is not configured');
        return;
      }
      
      // Load Google Sign-In script
      if (!window.google) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          this.setupGoogleSignIn();
        };
        script.onerror = () => {
          console.error('Failed to load Google Sign-In script');
        };
        document.head.appendChild(script);
      } else {
        this.setupGoogleSignIn();
      }
    },
    
    setupGoogleSignIn() {
      try {
        window.google.accounts.id.initialize({
          client_id: this.clientId,
          callback: this.handleGoogleResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: false,
          ux_mode: 'popup'
        });
        
        // Also render a hidden button for fallback
        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            shape: 'rectangular',
            width: 250
          }
        );
      } catch (error) {
        console.error('Error initializing Google Sign-In:', error);
      }
    },
    
    handleGoogleLogin() {
      if (!this.clientId) {
        this.error = 'Google Client ID is not configured';
        return;
      }
      
      this.isGoogleLoading = true;
      this.error = '';
      
      try {
        // Try to click the hidden Google button first
        const hiddenButton = document.getElementById('google-signin-button');
        const actualButton = hiddenButton?.querySelector('div[role="button"]');
        
        if (actualButton) {
          actualButton.click();
        } else {
          // Fallback to prompt
          window.google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
              this.isGoogleLoading = false;
              this.error = 'Google Sign-In not available. Please check your configuration.';
            }
          });
        }
      } catch (error) {
        console.error('Error with Google Sign-In:', error);
        this.isGoogleLoading = false;
        this.error = 'Failed to initialize Google Sign-In';
      }
    },
    
    initOAuth2Popup() {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: this.clientId,
          scope: 'email profile openid',
          callback: (response) => {
            if (response.error) {
              this.isGoogleLoading = false;
              this.error = 'Google login failed: ' + response.error;
              return;
            }
            
            if (response.access_token) {
              this.processGoogleAuth(response.access_token);
            } else {
              this.isGoogleLoading = false;
              this.error = 'Google login cancelled';
            }
          }
        });
        
        tokenClient.requestAccessToken({
          prompt: 'consent'
        });
      } catch (error) {
        console.error('Error initializing OAuth2 popup:', error);
        this.isGoogleLoading = false;
        this.error = 'Failed to initialize Google OAuth';
      }
    },
    
    async handleGoogleResponse(response) {
      this.isGoogleLoading = true;
      try {
        // Send the credential to your backend - using your existing endpoint
        const res = await axios.post('/auth/google-signup', {
          credential: response.credential
        });
        
        localStorage.setItem('token', res.data.token);
        this.$router.push('/chargers');
      } catch (err) {
        this.error = err.response?.data?.message || 'Google login failed';
      } finally {
        this.isGoogleLoading = false;
      }
    }
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  background: #f0f4f8;
  padding: 20px;
}

.login-card {
  background: #fff;
  padding: 30px 40px;
  border-radius: 10px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 450px;
  text-align: center;
}

h2 {
  margin-bottom: 25px;
  color: #333;
  font-weight: 600;
  font-size: 28px;
}

.login-form input {
  width: 100%;
  max-width: 90%;
  padding: 12px 15px;
  margin: 10px 0;
  border-radius: 6px;
  border: 1.5px solid #ddd;
  font-size: 16px;
  transition: border-color 0.3s ease;
}

.login-form input:focus {
  border-color: #3f51b5;
  outline: none;
  box-shadow: 0 0 8px rgba(63, 81, 181, 0.3);
}

.btn-login {
  width: 100%;
  padding: 12px;
  margin-top: 15px;
  background-color: #3f51b5;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 18px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.btn-login:hover {
  background-color: #303f9f;
}

.divider {
  position: relative;
  margin: 25px 0;
  text-align: center;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: #ddd;
}

.divider span {
  background: white;
  padding: 0 15px;
  color: #666;
  font-size: 14px;
  font-weight: 500;
}

.btn-google {
  width: 100%;
  padding: 12px 16px;
  background-color: white;
  border: 2px solid #dadce0;
  border-radius: 6px;
  color: #3c4043;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 20px;
}

.btn-google:hover:not(:disabled) {
  background-color: #f8f9fa;
  border-color: #c1c5c9;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-google:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.google-icon {
  width: 20px;
  height: 20px;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #3f51b5;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  color: #e53935;
  margin-top: 10px;
  font-weight: 500;
}

.register-text {
  margin-top: 20px;
  font-size: 14px;
  color: #555;
}

.register-link {
  color: #3f51b5;
  font-weight: 600;
  text-decoration: none;
  margin-left: 5px;
  transition: color 0.3s ease;
}

.register-link:hover {
  color: #303f9f;
  text-decoration: underline;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  max-width: 400px;
  width: 90%;
  text-align: center;
}

.modal-content h3 {
  margin-bottom: 15px;
  color: #333;
  font-size: 24px;
}

.modal-content p {
  margin-bottom: 15px;
  color: #555;
  line-height: 1.5;
}

.modal-buttons {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 25px;
}

.btn-register {
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.btn-register:hover {
  background-color: #45a049;
}

.btn-cancel {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.btn-cancel:hover {
  background-color: #d32f2f;
}
</style>