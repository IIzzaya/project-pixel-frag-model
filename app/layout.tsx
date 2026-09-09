import type { Metadata } from 'next';
import { BASE_PATH } from '@/lib/paths';
import './globals.css';
export const metadata: Metadata = {
  title: 'FRAG. — 像素英雄档案',
  description:
    '小小像素，无畏勇者。探索会旋转、解构与重组的像素英雄：程序化三维体素、双重形态与实时互动。',
  icons: { icon: `${BASE_PATH}/favicon.svg` },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
