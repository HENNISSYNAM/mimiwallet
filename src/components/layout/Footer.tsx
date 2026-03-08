import { Link } from 'react-router-dom';

const footerLinks = {
  'Sản phẩm': ['Invoice Financing', 'Vay vốn', 'Dashboard', 'API'],
  'Công ty': ['Về chúng tôi', 'Blog', 'Tuyển dụng', 'Liên hệ'],
  'Pháp lý': ['Điều khoản sử dụng', 'Bảo mật', 'Cookie'],
};

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background py-16">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="font-display font-extrabold text-primary-foreground text-sm">K</span>
              </div>
              <span className="font-display font-bold text-foreground text-lg">KAPIVA</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4">Vốn thông minh cho doanh nghiệp Việt.</p>
          </div>
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-body font-semibold text-foreground text-sm mb-4">{title}</h4>
              <ul className="space-y-2">
                {links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © 2025 KAPIVA Technology JSC | Được cấp phép bởi NHNN Việt Nam | MST: 0123456789
        </div>
      </div>
    </footer>
  );
}
