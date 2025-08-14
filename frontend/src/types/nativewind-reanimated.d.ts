import "react-native-reanimated";
import * as React from "react";

declare module "react-native-reanimated" {
  interface AnimateProps<S> {
    className?: string;
    children?: React.ReactNode;
    entering?: any;
    exiting?: any;
    layout?: any;
  }
}