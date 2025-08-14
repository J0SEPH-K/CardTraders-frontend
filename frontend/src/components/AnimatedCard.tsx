import Animated, { FadeInDown } from "react-native-reanimated";
import { ViewProps } from "react-native";
export default function AnimatedCard(props: ViewProps & { children: React.ReactNode }){
  return (
    <Animated.View entering={FadeInDown.duration(300)} className="rounded-2xl p-4 bg-white dark:bg-neutral-900 shadow-md" {...props} />
  );
}
