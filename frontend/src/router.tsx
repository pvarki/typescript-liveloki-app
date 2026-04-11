import { createHashRouter } from "react-router-dom";

import { DashboardLayout, DashboardPage, NavigateToFirst } from "./DashboardApp.tsx";
import { EventView } from "./routes/EventView.tsx";
import { GroupView } from "./routes/GroupView.tsx";

export const router = createHashRouter([
  {
    path: "/",
    element: <DashboardLayout />,
    children: [
      { index: true, element: <NavigateToFirst /> },
      { path: "d/:dashboardId", element: <DashboardPage /> },
      { path: "event/:id", element: <EventView /> },
      { path: "group/:groupName", element: <GroupView /> },
    ],
  },
]);
