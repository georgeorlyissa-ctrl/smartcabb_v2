import * as React from 'react';

// Wrapper local pour Radix UI Scroll Area (remplace @radix-ui/react-scroll-area)
export const Root = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    type?: 'auto' | 'always' | 'scroll' | 'hover';
    scrollHideDelay?: number;
    dir?: 'ltr' | 'rtl';
  }
>(({ children, type = 'hover', className, style, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-radix-scroll-area-root=""
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
});
Root.displayName = 'ScrollAreaRoot';

export const Viewport = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className, style, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-radix-scroll-area-viewport=""
      className={className}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'scroll',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
});
Viewport.displayName = 'ScrollAreaViewport';

export const Scrollbar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    orientation?: 'vertical' | 'horizontal';
    forceMount?: boolean;
  }
>(({ orientation = 'vertical', className, style, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-radix-scroll-area-scrollbar=""
      data-orientation={orientation}
      className={className}
      style={{
        display: 'flex',
        userSelect: 'none',
        touchAction: 'none',
        padding: 2,
        background: 'transparent',
        transition: 'background 160ms ease-out',
        ...(orientation === 'vertical'
          ? {
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: 10,
            }
          : {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 10,
              flexDirection: 'column',
            }),
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
});
Scrollbar.displayName = 'ScrollAreaScrollbar';

export const Thumb = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, style, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-radix-scroll-area-thumb=""
      className={className}
      style={{
        flex: 1,
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 9999,
        position: 'relative',
        ...style,
      }}
      {...props}
    />
  );
});
Thumb.displayName = 'ScrollAreaThumb';

export const Corner = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, style, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-radix-scroll-area-corner=""
      className={className}
      style={style}
      {...props}
    />
  );
});
Corner.displayName = 'ScrollAreaCorner';
