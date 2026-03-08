import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const NotFound = () => (
  <div className="min-h-screen bg-background flex items-center justify-center p-4">
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center"
    >
      <h1 className="font-display font-extrabold text-7xl text-primary mb-4">404</h1>
      <p className="text-xl text-foreground font-display font-bold mb-2">Trang không tồn tại</p>
      <p className="text-muted-foreground mb-8">Trang bạn tìm kiếm không có hoặc đã bị xóa.</p>
      <Link
        to="/"
        className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-display font-bold hover:brightness-110 transition-all"
      >
        ← Về trang chủ
      </Link>
    </motion.div>
  </div>
);

export default NotFound;
