import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/Providers";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LangProvider } from "@/contexts/LangContext";
import { Toaster } from "react-hot-toast";
import NextTopLoader from "nextjs-toploader";

const geist = Geist({ subsets: ["latin"] });

export const metadata = {
  title: "Swaroop Nivas",
  description: "Rental Management App for Swaroop Nivas building",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geist.className} antialiased`}>
        <NextTopLoader
          color="var(--color-walnut-500)"
          initialPosition={0.08}
          crawlSpeed={200}
          height={4}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px var(--color-walnut-500),0 0 5px var(--color-walnut-500)"
        />
        <ThemeProvider>
          <LangProvider>
            <AuthProvider>
              {children}
              <Toaster
                position="top-center"
                toastOptions={{
                  duration: 3000,
                  style: { borderRadius: "12px", fontFamily: "inherit", fontSize: "15px" },
                }}
              />
            </AuthProvider>
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
