import { createHashRouter } from "react-router-dom";

import { DefaultView } from "./routes/DefaultView.tsx";
import { EventView } from "./routes/EventView.tsx";
import { Root } from "./routes/Root.tsx";

export const router = createHashRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      { index: true, element: <DefaultView /> },
      { path: "event/:id", element: <EventView /> },
    ],
  },
]);
