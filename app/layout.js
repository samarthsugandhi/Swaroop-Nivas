import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/Providers";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LangProvider } from "@/contexts/LangContext";
import { Toaster } from "react-hot-toast";

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
