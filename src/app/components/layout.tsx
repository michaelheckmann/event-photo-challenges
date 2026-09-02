import { ReactNode } from "react";
import { Header } from "./header";
import { TabBar } from "./tab-bar";

export const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <main className="bg-neutral-100">
      <div className="max-w-2xl bg-neutral-50 min-h-[calc(100vh-4rem)] mx-auto sm:border-x mb-16">
        <Header />
        {children}
        <TabBar />
      </div>
    </main>
  );
};
