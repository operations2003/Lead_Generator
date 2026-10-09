import React from 'react';

declare global {
  namespace JSX {
    interface Element extends React.ReactElement<any, any> {}
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

declare module 'lucide-react' {
  export interface LucideProps extends React.SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
    className?: string;
    style?: React.CSSProperties;
    absoluteStrokeWidth?: boolean;
    [key: string]: any;
  }
}
