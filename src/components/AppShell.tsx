import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import MobileNav from '@/components/MobileNav';
import { useLanguage } from '@/hooks/useLanguage';

export default function AppShell({ children }: { children: ReactNode }) {
  const { activeLanguage } = useLanguage();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 items-center border-b border-border px-3 hidden md:flex justify-between">
            <SidebarTrigger />
            {activeLanguage && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span>Learning:</span>
                <span className="font-medium text-foreground">
                  {activeLanguage.name} {activeLanguage.flag_emoji}
                </span>
              </div>
            )}
          </header>
          <main className="flex-1 pb-20 md:pb-4 max-w-4xl w-full mx-auto">
            {children}
          </main>
        </div>
        <MobileNav />
      </div>
    </SidebarProvider>
  );
}
