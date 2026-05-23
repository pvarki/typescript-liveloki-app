import { useWidgetRegistry } from "../stores/widget-registry";
import { clockDescriptor } from "./clock";
import { detailViewDescriptor } from "./detail-view";
import { eventsBarChartDescriptor } from "./events-bar-chart";
import { eventsFeedDescriptor } from "./events-feed";
import { externalEmbedDescriptor } from "./external-embed";
import { formDescriptor } from "./form";
import { mapDescriptor } from "./map";
import { metricDescriptor } from "./metric";
import { noteDescriptor } from "./note";
import { rtmpVideoDescriptor } from "./rtmp-video";
import { tableDescriptor } from "./table";
import { timelineDescriptor } from "./timeline";
import { timerDescriptor } from "./timer";
import { todoDescriptor } from "./todo";
import { weatherMapDescriptor } from "./weather-map";

export function registerAllWidgets() {
  const { register } = useWidgetRegistry.getState();
  register(clockDescriptor);
  register(eventsBarChartDescriptor);
  register(eventsFeedDescriptor);
  register(detailViewDescriptor);
  register(externalEmbedDescriptor);
  register(mapDescriptor);
  register(noteDescriptor);
  register(metricDescriptor);
  register(todoDescriptor);
  register(timerDescriptor);
  register(weatherMapDescriptor);
  register(tableDescriptor);
  register(rtmpVideoDescriptor);
  register(formDescriptor);
  register(timelineDescriptor);
}
