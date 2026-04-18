import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '투자 포트폴리오 대시보드',
  description: '섹터별 투자 포트폴리오 분석 대시보드',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
