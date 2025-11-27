"use client"

import { Tooltip as MUITooltip } from "@mui/material"
import type { TooltipProps } from '@mui/material'
type Placement = NonNullable<TooltipProps['placement']>
import { ReactElement } from "react"

const MyTooltip = ({
  children,
  content,
  placement = "top-start",
  maxWidth = 400,
  interactive = false,
  noBox = false,
  wrapperClassName = '',
  noMargin=true,
}: {
  children: ReactElement;
  content: React.ReactNode;
  placement?: Placement;
  interactive?: boolean;
  maxWidth?: number;
  noBox?: boolean;
  wrapperClassName?: string;
  noMargin?: boolean;
}) => {

  const marginProps = noMargin ? {
    popper: {
      sx: {
        '&[data-popper-placement*="bottom"] .MuiTooltip-tooltip': {
          marginTop: '0 !important',
        },
        '&[data-popper-placement*="top"] .MuiTooltip-tooltip': {
          marginBottom: '0 !important',
        },
        '&[data-popper-placement*="right"] .MuiTooltip-tooltip': {
          marginLeft: '0 !important',
        },
        '&[data-popper-placement*="left"] .MuiTooltip-tooltip': {
          marginRight: '0 !important',
        },
      },
      modifiers: [
        {
          name: 'offset',
          options: {
            offset: [0, 0],
          },
        },
      ],
    },
  } : {};

  return (
    <MUITooltip
      title={content}
      placement={placement}
      disableInteractive={!interactive}
      enterNextDelay={0}
      enterDelay={0}
      leaveDelay={0}
      TransitionProps={{
        timeout: 0
      }}
      componentsProps={{
        tooltip: {
          sx: {
            maxWidth: maxWidth,
            ...(noBox && {
              bgcolor: 'transparent',
              color: 'inherit',
              boxShadow: 'none'
            }),
            ...(!noBox && {
              bgcolor: 'rgba(0,0,0,0.65)',
              color: 'white',
              fontSize: '0.875rem',
              borderRadius: '6px',
              padding: '8px'
            }),
            transform: 'none !important'
          }
        },
        ...marginProps
      }}
    >
      {children}
    </MUITooltip>
  )
}

const MyTooltip2 = ({
  children,
  content,
  placement = "top-start",
  width = 180,
  noBox = false,
  interactive = false,
  wrapperClassName = ''
}: {
  children: ReactElement;
  content: React.ReactNode;
  placement?: Placement;
  width?: number;
  noBox?: boolean;
  interactive?: boolean;
  wrapperClassName?: string;
}) => {
  // Determine positioning classes based on the supplied placement
  const positionClasses = placement.includes('top')
    ? `bottom-full ${interactive ? '' : 'mb-2'}`
    : placement.includes('bottom')
      ? `top-full ${interactive ? '' : 'mt-2'}`
      : placement.includes('left')
        ? `right-full ${interactive ? '' : 'mr-2'} top-1/2 -translate-y-1/2`
        : placement.includes('right')
          ? `left-full ${interactive ? '' : 'ml-2'} top-1/2 -translate-y-1/2`
          : ''

  const alignClasses = placement.includes('start')
    ? 'left-0'
    : placement.includes('end')
      ? 'right-0'
      : placement.includes('left') || placement.includes('right')
        ? ''
        : 'left-1/2 -translate-x-1/2'

  // Tooltip becomes visible on hover always. It also becomes visible on keyboard-initiated focus (focus-visible)
  // so screen-reader / keyboard users can access it, but programmatic focus (like Radix Dialog's auto-focus)
  // will not trigger it. This prevents the tooltip from showing immediately when a dialog opens while
  // retaining accessibility via Tab navigation.
  const visibilityClasses = interactive ? 'group-hover:visible group-focus-visible:visible' : 'group-hover:visible'

  return (
    <span
      className={`relative inline-block group focus:outline-none ${wrapperClassName}`}
      tabIndex={0}
    >
      {children}
      <div
        className={`
          absolute z-[10000000000] invisible ${visibilityClasses} ui w-[${width}]
          ${positionClasses}
          ${alignClasses}
          ${noBox ? 'bg-transparent' : 'bg-black/65 text-white rounded-lg p-2'}
          text-sm
          ${interactive ? '' : 'pointer-events-none'}
        `}
        style={{
          width: width
        }}
      >
        {content}
      </div>
    </span>
  )
}

export default MyTooltip
