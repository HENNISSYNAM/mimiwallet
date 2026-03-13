import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { Loader2, Leaf } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import mimiLogo from '@/assets/mimi-wallet-logo.png';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
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
            className="h-16 w-auto mx-auto mb-4"
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
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">{t('login.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-accent border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            />
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

        <p className="text-center text-xs text-muted-foreground mt-4">
          {t('login.noAccount')}{' '}
          <button onClick={() => navigate('/register')} className="text-primary hover:underline font-medium">{t('login.register')}</button>
        </p>
      </motion.div>
    </div>
  );
}
