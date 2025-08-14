import "@/styles/nativewind";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ViewProps } from "react-native";

type Props = ViewProps & { children: React.ReactNode; className?: string };

export default function AnimatedCard({ children, className, ...rest }: Props) {
  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      className={`rounded-2xl p-4 bg-white dark:bg-neutral-900 shadow-md ${className ?? ""}`}
      {...rest}
    >
      {children}
    </Animated.View>
  );
}
