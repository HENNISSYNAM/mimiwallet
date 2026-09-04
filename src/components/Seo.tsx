import { Helmet } from 'react-helmet-async';

const SITE = 'https://mimiwallet.lovable.app';

type Props = {
  title: string;
  description: string;
  /** Route path, ví dụ "/dashboard". Dùng cho canonical + og:url tự trỏ. */
  path: string;
  /** Trang sau đăng nhập không nên nằm trong chỉ mục tìm kiếm. */
  noIndex?: boolean;
};

/**
 * Đặt <title>, description và canonical riêng cho từng route.
 *
 * index.html vẫn giữ bộ thẻ mặc định làm dự phòng cho các crawler không chạy
 * JS (Facebook, LinkedIn, Slack); Helmet ghi đè cho crawler có chạy JS.
 */
export default function Seo({ title, description, path, noIndex }: Props) {
  const url = `${SITE}${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {noIndex ? <meta name="robots" content="noindex, nofollow" /> : null}
    </Helmet>
  );
}
