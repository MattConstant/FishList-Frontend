import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal",
};

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      {children}
    </div>
  );
}
