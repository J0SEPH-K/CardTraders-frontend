import Animated, { FadeInDown } from "react-native-reanimated";
import { View, ViewProps } from "react-native";

type Props = ViewProps & { children: React.ReactNode; className?: string };

export default function AnimatedCard({ children, className, ...rest }: Props) {
  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <View
        className={`rounded-2xl p-4 bg-white dark:bg-neutral-900 shadow-md ${className ?? ""}`}
        {...rest}
      >
        {children}
      </View>
    </Animated.View>
  );
}