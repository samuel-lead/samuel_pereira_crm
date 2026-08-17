import { Sidebar } from "@/components/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f4f5f7]">
      <Sidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
