import { FilteredEvent } from "../types.ts";
import * as Tooltip from "@radix-ui/react-tooltip";
import { reliabilityScale, credibilityScale } from "../data/admiralty-code.ts";
import React from "react";

function getRelAccTooltipContent(admiralty_reliability: string, admiralty_accuracy: string) {
  const tooltipContent = [];
  const reliabilityDesc = reliabilityScale[admiralty_reliability.toUpperCase()];
  if (reliabilityDesc) {
    tooltipContent.push(
      <div>
        <h2 className="text-lg">
          Reliability {admiralty_reliability}: {reliabilityDesc.title}
        </h2>
        <p>{reliabilityDesc.description}</p>
      </div>,
    );
  }
  const credibilityDesc = credibilityScale[admiralty_accuracy.toUpperCase()];
  if (credibilityDesc) {
    tooltipContent.push(
      <div>
        <h2 className="text-lg">
          Accuracy {admiralty_accuracy}: {credibilityDesc.title}
        </h2>
        <p>{credibilityDesc.description}</p>
      </div>,
    );
  }
  if (tooltipContent.length === 0) return null;
  return React.createElement("div", {}, tooltipContent);
}

export function EventRelAcc({ event }: { event: FilteredEvent }) {
  const { admiralty_accuracy, admiralty_reliability } = event;
  if (!(admiralty_reliability || admiralty_accuracy)) return null;
  const content = (
    <>
      {admiralty_reliability || "-"}&#x2009;/&#x2009;{admiralty_accuracy || "-"}
    </>
  );
  const tooltipContent = getRelAccTooltipContent(admiralty_reliability, admiralty_accuracy);
  if (!tooltipContent) {
    return content;
  }
  return (
    <Tooltip.Provider>
      <Tooltip.Root delayDuration={100}>
        <Tooltip.Trigger asChild>
          <span className="decoration-dotted underline">{content}</span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="bg-black/90 p-2 max-w-lg text-sm" sideOffset={5}>
            {tooltipContent}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
