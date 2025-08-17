
import React from "react";
import { FontAwesome5 } from "@expo/vector-icons";

type Props = React.ComponentProps<typeof FontAwesome5>;

export default function Icon(props: Props) {
  return <FontAwesome5 {...props} />;
}