import { Manrope, Playfair_Display } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-manrope",
});

const playfair = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  style: ["normal", "italic"],
  variable: "--font-playfair",
});

export const metadata = {
  title: "Меню в PDF · MAIN MENU",
  description: "Загрузите Excel-файл с меню и получите фирменный PDF для печати.",
  robots: { index: false, follow: false },
};

export const viewport = {
  themeColor: "#FDF8F0",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru" className={`${manrope.variable} ${playfair.variable}`}>
      <body>
        <div className="grain" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
