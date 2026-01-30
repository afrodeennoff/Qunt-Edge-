import { ThemeProvider } from "@/context/theme-provider";
import { DataProvider } from "@/context/data-provider";
import Modals from "@/components/modals";
import { SyncContextProvider } from "@/context/sync-context";
import { RithmicSyncNotifications } from "./components/import/rithmic/sync/rithmic-notifications";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "./components/sidebar";
import DashboardHeader from "./components/dashboard-header";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <ThemeProvider>
        <DataProvider>
          <SyncContextProvider>
            <RithmicSyncNotifications />
            <Toaster />
            <div className="flex h-screen bg-background overflow-hidden relative">
              <Sidebar />
              <main className="flex-1 flex flex-col h-full w-full overflow-hidden relative">
                <DashboardHeader />
                <div className="flex-1 overflow-y-auto">
                  {children}
                </div>
              </main>
            </div>
            <Modals />
          </SyncContextProvider>
        </DataProvider>
      </ThemeProvider>
    </TooltipProvider>
  );
}
