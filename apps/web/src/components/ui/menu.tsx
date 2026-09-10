'use client';

import * as React from 'react';
import {
  MenuTrigger as AriaMenuTrigger,
  Menu as AriaMenu,
  MenuItem as AriaMenuItem,
  Popover as AriaPopover,
  Separator as AriaSeparator,
  Section as AriaSection,
  Header as AriaHeader,
  Button as AriaButton,
  type MenuProps as AriaMenuProps,
  type MenuItemProps as AriaMenuItemProps,
  type PopoverProps as AriaPopoverProps,
  type ButtonProps as AriaButtonProps,
} from 'react-aria-components';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const MenuTrigger = AriaMenuTrigger;
export const MenuSection = AriaSection;
export const MenuHeader = AriaHeader;

export interface MenuButtonProps extends AriaButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'danger' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const MenuButton = React.forwardRef<HTMLButtonElement, MenuButtonProps>(
  ({ className, variant = 'ghost', size = 'sm', children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors outline-none focus:outline-none focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none rounded-md cursor-pointer';

    const variants = {
      default: 'bg-slate-900 text-white hover:bg-slate-800',
      danger: 'bg-[#b84343] text-white hover:bg-[#9d3838] border border-[#a23b3b] shadow-xs font-semibold text-xs',
      outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
      ghost: 'bg-transparent',
      icon: 'p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors',
    };

    const sizes = {
      sm: 'px-2.5 py-1 text-xs',
      md: 'px-3.5 py-1.5 text-sm',
      lg: 'px-5 py-2 text-base',
      icon: 'p-1',
    };

    return (
      <AriaButton
        ref={ref}
        className={(renderProps) =>
          twMerge(
            clsx(
              baseStyles,
              variants[variant],
              sizes[size],
              typeof className === 'function' ? className(renderProps) : className
            )
          )
        }
        {...props}
      >
        {children}
      </AriaButton>
    );
  }
);
MenuButton.displayName = 'MenuButton';

export interface MenuProps<T> extends AriaMenuProps<T> {
  placement?: AriaPopoverProps['placement'];
  popoverClassName?: string;
  offset?: number;
}

export function Menu<T extends object>({
  placement = 'bottom end',
  offset = 4,
  popoverClassName,
  className,
  children,
  items,
  ...props
}: MenuProps<T>) {
  return (
    <AriaPopover
      placement={placement}
      offset={offset}
      className={({ isEntering, isExiting }) =>
        twMerge(
          clsx(
            'z-50 min-w-[170px] rounded-lg bg-white p-1 shadow-xl border border-slate-200/90 outline-none font-sans text-xs',
            isEntering && 'animate-in fade-in zoom-in-95 duration-100 ease-out',
            isExiting && 'animate-out fade-out zoom-out-95 duration-75 ease-in',
            popoverClassName
          )
        )
      }
    >
      <AriaMenu
        {...props}
        items={items}
        className={twMerge(clsx('outline-none space-y-0.5', className))}
      >
        {children}
      </AriaMenu>
    </AriaPopover>
  );
}

export interface MenuItemProps extends AriaMenuItemProps {
  variant?: 'default' | 'danger';
  destructive?: boolean;
}

export function MenuItem({
  className,
  variant = 'default',
  destructive = false,
  children,
  ...props
}: MenuItemProps) {
  const isDanger = variant === 'danger' || destructive;
  return (
    <AriaMenuItem
      {...props}
      className={(renderProps) => {
        const { isFocused, isPressed, isDisabled } = renderProps;
        return twMerge(
          clsx(
            'group flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium outline-none transition-colors cursor-pointer ',
            isDanger
              ? isFocused || isPressed
                ? 'bg-red-50 text-red-600 font-semibold'
                : 'text-red-600 font-semibold'
              : isFocused || isPressed
              ? 'bg-slate-100 text-slate-900'
              : 'text-slate-700',
            isDisabled && 'opacity-50 pointer-events-none cursor-not-allowed',
            typeof className === 'function' ? className(renderProps) : className
          )
        );
      }}
    >
      {children}
    </AriaMenuItem>
  );
}

export const MenuSeparator = ({ className }: { className?: string }) => (
  <AriaSeparator className={twMerge('my-1 border-t border-slate-100', className)} />
);
