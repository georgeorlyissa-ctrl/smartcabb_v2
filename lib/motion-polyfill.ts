import * as React from 'react';

interface MotionProps {
  initial?: any;
  animate?: any;
  exit?: any;
  transition?: any;
  variants?: any;
  whileHover?: any;
  whileTap?: any;
  whileInView?: any;
  viewport?: any;
  layout?: boolean | string;
  layoutId?: string;
  drag?: boolean | 'x' | 'y';
  dragConstraints?: any;
  dragElastic?: number;
  dragMomentum?: boolean;
  onDragStart?: (event: any, info: any) => void;
  onDragEnd?: (event: any, info: any) => void;
  children?: React.ReactNode;
  [key: string]: any;
}

const createMotionElement = (type: string) => {
  const Component = React.forwardRef<any, MotionProps>((props, ref) => {
    const {
      initial,
      animate,
      exit,
      transition,
      variants,
      whileHover,
      whileTap,
      whileInView,
      viewport,
      layout,
      layoutId,
      drag,
      dragConstraints,
      dragElastic,
      dragMomentum,
      onDragStart,
      onDragEnd,
      children,
      ...htmlProps
    } = props;

    return React.createElement(type, { ref, ...htmlProps }, children);
  });

  Component.displayName = `Motion${type.charAt(0).toUpperCase()}${type.slice(1)}`;
  return Component;
};

const motionElements = [
  'div', 'button', 'span', 'img', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'section', 'article', 'nav', 'header', 'footer', 'aside', 'main',
  'ul', 'ol', 'li', 'form', 'label', 'input', 'textarea', 'select',
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
];

const createMotionObject = () => {
  const obj: Record<string, React.ForwardRefExoticComponent<any>> = {};

  motionElements.forEach((element) => {
    obj[element] = createMotionElement(element);
  });

  return obj;
};

const AnimatePresenceFallback: React.FC<{
  children: React.ReactNode;
  mode?: 'wait' | 'sync' | 'popLayout';
  initial?: boolean;
  onExitComplete?: () => void;
}> = ({ children }) => React.createElement(React.Fragment, null, children);

AnimatePresenceFallback.displayName = 'AnimatePresence';

export const motion = createMotionObject();
export const AnimatePresence = AnimatePresenceFallback;

if (typeof window !== 'undefined') {
  (window as any).motion = motion;
  (window as any).AnimatePresence = AnimatePresence;
}

export default motion;
