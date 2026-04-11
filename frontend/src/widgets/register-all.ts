import { useWidgetRegistry } from "../stores/widget-registry";
import { calendarDescriptor } from "./calendar";
import { clockDescriptor } from "./clock";
import { detailViewDescriptor } from "./detail-view";
import { eventsFeedDescriptor } from "./events-feed";
import { externalEmbedDescriptor } from "./external-embed";
import { formDescriptor } from "./form";
import { inventoryDescriptor } from "./inventory";
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
  register(calendarDescriptor);
  register(clockDescriptor);
  register(detailViewDescriptor);
  register(eventsFeedDescriptor);
  register(externalEmbedDescriptor);
  register(formDescriptor);
  register(inventoryDescriptor);
  register(mapDescriptor);
  register(metricDescriptor);
  register(noteDescriptor);
  register(rtmpVideoDescriptor);
  register(tableDescriptor);
  register(timelineDescriptor);
  register(timerDescriptor);
  register(todoDescriptor);
  register(weatherMapDescriptor);
}
