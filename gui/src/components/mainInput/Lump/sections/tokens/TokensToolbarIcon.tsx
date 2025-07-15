import { ChartBarIcon } from "@heroicons/react/24/outline";
import { vscBadgeForeground } from "../../../..";
import { useFontSize } from "../../../../ui/font";
import { ToolTip } from "../../../../gui/Tooltip";
import HoverItem from "../../../InputToolbar/HoverItem";
import { useTokenCount } from "../../../../../hooks/useTokenCount";
import { TokensSectionTooltip } from "./TokensSectionTooltip";

interface TokensToolbarIconProps {
  isSelected?: boolean;
  onClick: () => void;
  className?: string;
}

export function TokensToolbarIcon({ isSelected, onClick, className }: TokensToolbarIconProps) {
  const { percentage } = useTokenCount();
  const fontSize = useFontSize(-3);
  const id = "block-settings-toolbar-icon-tokens";

  // Get color based on token usage percentage
  const getIconColor = () => {
    if (isSelected) return vscBadgeForeground;
    if (percentage < 60) return undefined; // default color
    if (percentage < 80) return "#eab308"; // yellow-500
    if (percentage < 95) return "#f97316"; // orange-500
    return "#ef4444"; // red-500
  };

  return (
    <>
      <HoverItem
        px={0}
        onClick={onClick}
        data-testid={id}
        data-tooltip-id={id}
      >
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClick();
            }
          }}
          className={`${
            isSelected ? "bg-badge" : undefined
          } relative flex select-none items-center rounded-full px-[3px] py-0.5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 sm:px-1 ${className || ""}`}
        >
          <ChartBarIcon
            className="h-[13px] w-[13px] flex-shrink-0 hover:brightness-125"
            style={{
              color: getIconColor(),
            }}
            aria-hidden="true"
          />
          <div
            style={{ fontSize }}
            className={`overflow-hidden transition-all duration-200 ${
              isSelected ? "ml-1 w-auto opacity-100" : "w-0 opacity-0"
            }`}
          >
            <span
              className="whitespace-nowrap"
              style={{ color: vscBadgeForeground }}
            >
              Tokens
            </span>
          </div>
        </div>
      </HoverItem>
      <ToolTip delayShow={700} id={id}>
        <TokensSectionTooltip />
      </ToolTip>
    </>
  );
}