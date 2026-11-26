import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Types } from "mongoose";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session || !Types.ObjectId.isValid(session.userId)) redirect("/login");

  await connectDB();
  const user = await User.findById(session.userId).select("name").lean();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar name={user.name} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-7 sm:px-6 lg:px-8">
          {children}
        </main>
        <footer className="border-t border-line px-6 py-4 text-[11px] text-inksoft">
          Ledgerline reference implementation · payments are simulated locally
        </footer>
      </div>
    </div>
  );
}
