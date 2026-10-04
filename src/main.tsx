import { StrictMode, lazy } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./index.css";
import { AppShell } from "@/components/layout/AppShell";
import DashboardPage from "@/pages/DashboardPage";
import NotFoundPage from "@/pages/NotFoundPage";
import RouteError from "@/pages/RouteError";

const ProblemPage = lazy(() => import("@/pages/ProblemPage"));
const ReviewPage = lazy(() => import("@/pages/ReviewPage"));
const DocsPage = lazy(() => import("@/pages/DocsPage"));
const ProgressPage = lazy(() => import("@/pages/ProgressPage"));

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      {
        errorElement: <RouteError />,
        children: [
      { path: "/", element: <DashboardPage /> },
      { path: "/problems/:slug", element: <ProblemPage /> },
      { path: "/review", element: <ReviewPage /> },
      { path: "/docs", element: <DocsPage /> },
      { path: "/progress", element: <ProgressPage /> },
      { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
