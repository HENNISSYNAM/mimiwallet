import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { Loader2, Leaf, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import mimiLogo from '@/assets/mimi-cat.webp';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { t } = useTranslation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(t('login.errorEmpty'));
      return;
    }
    setLoading(true);
    const { error } = await login(email, password);
    setLoading(false);
    if (error) {
      toast.error(error === 'Invalid login credentials' ? t('login.errorInvalid') : error);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30">
        <motion.div 
          className="absolute top-20 left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], x: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-20 right-20 w-96 h-96 bg-mimi-green/20 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], y: [0, -30, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="text-center mb-8">
          <motion.img 
            src={mimiLogo} 
            alt="MIMI WALLET" 
            className="h-20 w-20 mx-auto mb-4"
            style={{ filter: 'drop-shadow(0 12px 20px rgba(120,53,15,.22))' }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          />
          <h1 className="font-display font-bold text-2xl text-foreground">{t('login.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
            <Leaf size={14} className="text-mimi-green" /> {t('login.tagline')}
          </p>
        </div>

        <motion.form 
          onSubmit={handleLogin} 
          className="card-base p-6 space-y-4 backdrop-blur-xl bg-card/80"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">{t('login.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login.emailPlaceholder')}
              className="w-full bg-accent border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>
          <div className="relative">
            <label className="text-sm text-muted-foreground mb-1 block">{t('login.password')}</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-accent border border-border rounded-lg px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              className="absolute right-3 top-[1.85rem] text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <motion.button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-mimi-green text-primary-foreground py-2.5 rounded-lg text-sm font-display font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {t('login.submit')}
          </motion.button>
        </motion.form>

        {/* Placed below the form, not above it. Google is the recommended route
            for new accounts, but an existing password user arriving at a screen
            whose first control is a Google button tends to press it and end up
            with a second, empty account under the same person. */}
        <div className="flex items-center gap-3 my-4" aria-hidden>
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">hoặc</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={async () => {
            setGoogleLoading(true);
            const { error } = await signInWithGoogle();
            // Only reached when the redirect never happened; on success the
            // browser has already left this page.
            if (error) {
              setGoogleLoading(false);
              toast.error(error);
            }
          }}
          disabled={googleLoading}
          className="w-full border border-border bg-card text-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-accent transition-colors flex items-center justify-center gap-2.5 disabled:opacity-60"
        >
          {googleLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden>
              <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.1z" />
              <path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.1H4.3v5.7C7.9 41 15.4 46 24 46z" />
              <path fill="#FBBC05" d="M11.6 28.1c-.4-1.3-.7-2.7-.7-4.1s.3-2.8.7-4.1v-5.7H4.3A22 22 0 0 0 2 24c0 3.5.8 6.9 2.3 9.8l7.3-5.7z" />
              <path fill="#EA4335" d="M24 10.8c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.1 30 2 24 2 15.4 2 7.9 7 4.3 14.2l7.3 5.7c1.7-5.2 6.6-9.1 12.4-9.1z" />
            </svg>
          )}
          Tiếp tục với Google
        </button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          {t('login.noAccount')}{' '}
          <button onClick={() => navigate('/register')} className="text-primary hover:underline font-medium">{t('login.register')}</button>
        </p>
      </motion.div>
    </div>
  );
}
