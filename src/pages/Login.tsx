import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/useAuthStore';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login();
    navigate('/dashboard');
  };

  const handleDemo = () => {
    login();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="font-display font-extrabold text-primary-foreground text-lg">K</span>
          </div>
          <h1 className="font-display font-bold text-2xl text-foreground">Đăng nhập KAPIVA</h1>
          <p className="text-sm text-muted-foreground mt-1">Quản lý vốn thông minh</p>
        </div>

        <form onSubmit={handleLogin} className="card-base p-6 space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@company.vn"
              className="w-full bg-accent border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-accent border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-display font-bold hover:brightness-110 transition-all"
          >
            Đăng nhập
          </button>
        </form>

        <button
          onClick={handleDemo}
          className="w-full mt-4 border border-border py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
        >
          🚀 Dùng thử demo
        </button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Chưa có tài khoản?{' '}
          <button onClick={() => navigate('/register')} className="text-primary hover:underline">Đăng ký miễn phí</button>
        </p>
      </motion.div>
    </div>
  );
}
