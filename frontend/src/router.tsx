import { createHashRouter } from "react-router-dom";
import { Root } from "./routes/Root.tsx";
import { DefaultView } from "./routes/DefaultView.tsx";
import { EventView } from "./routes/EventView.tsx";

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
