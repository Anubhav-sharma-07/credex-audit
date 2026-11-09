import WorkspaceSidebar from "@/components/workspace/Sidebar";
import CommandPalette from "@/components/workspace/CommandPalette";

export const dynamic = "force-dynamic";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-canvas text-ink antialiased">
      {/* Accessible Skip Link for Screen Readers & Keyboard Operability */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-ink focus:text-neutral-1 focus:rounded-xs focus:shadow-md text-xs font-semibold"
      >
        Skip to main content
      </a>

      {/* Global Command Palette */}
      <CommandPalette />

      {/* Primary Sidebar */}
      <WorkspaceSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto outline-hidden"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
