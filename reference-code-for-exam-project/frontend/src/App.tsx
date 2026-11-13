
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { Suspense } from "react";

import { queryClient } from "./shared/api";
import { AppRouter } from "./app/router";

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>
        <AppRouter />
      </Suspense>
      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: "rounded-xl border border-border bg-white text-sm shadow-lg shadow-navy-900/8",
            error: "border-red-200 bg-red-50 text-red-900",
            success: "border-accent/25 bg-accent-soft text-accent",
          },
        }}
        richColors={false}
        closeButton
      />
    </QueryClientProvider>
  );
}
