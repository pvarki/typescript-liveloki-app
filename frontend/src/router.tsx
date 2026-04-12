import { createHashRouter } from "react-router-dom";

import { DashboardLayout, DashboardPage, NavigateToFirst } from "./DashboardApp.tsx";
import { EventView } from "./routes/EventView.tsx";
import { GroupView } from "./routes/GroupView.tsx";
import { RouteErrorBoundary } from "./routes/RouteErrorBoundary.tsx";

export const router = createHashRouter([
  {
    path: "/",
    element: <DashboardLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <NavigateToFirst /> },
      { path: "d/:dashboardId", element: <DashboardPage /> },
      { path: "event/:id", element: <EventView /> },
      { path: "group/:groupName", element: <GroupView /> },
    ],
  },
]);
