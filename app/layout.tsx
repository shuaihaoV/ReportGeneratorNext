import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ReportProvider } from "@/contexts/ReportContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "风险隐患报告生成器",
  description: "基于Tauri和Next.js的风险隐患报告生成器",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body className="antialiased">
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <NavigationProvider>
              <ReportProvider>
                <SidebarProvider>
                  <AppSidebar />
                  <main className="flex-1 flex flex-col min-h-screen" data-tauri-drag-region>
                    <div className="flex-1 p-4" data-tauri-drag-region>
                        {children}
                    </div>
                  </main>
                </SidebarProvider>
              </ReportProvider>
            </NavigationProvider>
            <Toaster position="bottom-left" richColors/>
          </ThemeProvider>
      </body>
    </html>
  );
}
