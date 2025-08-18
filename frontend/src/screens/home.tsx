import React, { useRef, useState } from "react";
import {
  View,
  Pressable,
  Animated,
  Dimensions,
  StyleSheet,
  Easing,
  Text,
  Image,
  PanResponder,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "../components/Icon";
import BuyerPage from "./buyerPage";
import SellerPage from "./sellerPage";
import AnalyticsPage from "./analytics"; // added import
import Svg, { Path } from "react-native-svg";
import CardDetailModal from "../components/CardDetailModal";

const Logo = require("../assets/CardTradersLogo_Original.png");

const TAB_ICONS = [
  { key: "판매", iconName: "plus" }, // changed to addition icon
  { key: "구매", logo: Logo },
  { key: "분석", iconName: "chart-line" }, // changed to analytics/chart icon
];

const SMALL_ICON_SIZE = 24;
const LARGE_ICON_SIZE = 44;
const CIRCLE_SIZE = 75; // used for notch sizing
const TAB_BAR_HEIGHT = 40;

// new border constants
const TAB_BORDER_WIDTH = 3;
const TAB_BORDER_COLOR = "#f93414";
const TAB_BACKGROUND = "#fff";

export default function Home() {
  const insets = useSafeAreaInsets();
  const windowWidth = Dimensions.get("window").width;
  const initialIndex = 1; // "구매" by default

  // keep a ref mirror of selectedIndex so PanResponder callbacks always read the latest value
  const selectedIndexRef = useRef<number>(initialIndex);

  // animate content sliding left/right — initialize using initialIndex
  const contentTranslate = useRef(new Animated.Value(-initialIndex * windowWidth)).current;

  // pad horizontally so notch can go near edges
  const horizontalPadding = CIRCLE_SIZE / 2;
  // compute tabWidth from the actual available width (subtract padding)
  const tabWidth = (windowWidth - horizontalPadding * 2) / TAB_ICONS.length;

  // index-based animations
  // highlightAnim stores the left position (in screen coords) of the tab's left edge relative to container start (including horizontalPadding)
  const highlightAnim = useRef(
    new Animated.Value(initialIndex * tabWidth + horizontalPadding)
  ).current;
  const selectedIndexAnim = useRef(new Animated.Value(initialIndex)).current; // index (0,1,2)

  const [selectedIndex, setSelectedIndex] = useState<number>(initialIndex);
  const [selectedCard, setSelectedCard] = useState(null);
  
  // gesture helpers
  const gestureStartIndexRef = useRef<number>(initialIndex);
  const isDraggingRef = useRef<boolean>(false);

  const handleTabPress = (index: number) => {
    setSelectedIndex(index);
    selectedIndexRef.current = index; // keep ref in sync

    Animated.parallel([
      Animated.spring(highlightAnim, {
        toValue: index * tabWidth + horizontalPadding,
        useNativeDriver: false,
        speed: 12,
        bounciness: 8,
      }),
      Animated.timing(selectedIndexAnim, {
        toValue: index,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      // slide content, direction handled by target translateX
      Animated.timing(contentTranslate, {
        toValue: -index * windowWidth,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Create PanResponder to support horizontal sliding between tabs
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        // only capture if horizontal movement is stronger than vertical
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 6;
      },
      onMoveShouldSetPanResponderCapture: (_evt, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 6;
      },

      onPanResponderGrant: () => {
        // mark start index (use ref so we get the latest value) and stop running animations
        gestureStartIndexRef.current = selectedIndexRef.current;
        isDraggingRef.current = true;
        contentTranslate.stopAnimation();
        highlightAnim.stopAnimation();
        selectedIndexAnim.stopAnimation();
      },

      onPanResponderMove: (_evt, gestureState) => {
        // compute new translate (clamped)
        const startOffset = -gestureStartIndexRef.current * windowWidth;
        let newTranslate = startOffset + gestureState.dx;
        const maxTranslate = 0;
        const minTranslate = -(TAB_ICONS.length - 1) * windowWidth;
        if (newTranslate > maxTranslate) newTranslate = maxTranslate + (newTranslate - maxTranslate) / 3; // soft overscroll
        if (newTranslate < minTranslate) newTranslate = minTranslate + (newTranslate - minTranslate) / 3; // soft overscroll

        // apply immediate translation
        contentTranslate.setValue(newTranslate);

        // update fractional index to move highlight and icon scalings while dragging
        const fractionalIndex = -newTranslate / windowWidth;
        highlightAnim.setValue(fractionalIndex * tabWidth + horizontalPadding);
        selectedIndexAnim.setValue(fractionalIndex);
      },

      onPanResponderRelease: (_evt, gestureState) => {
        isDraggingRef.current = false;
        // determine final index: base index + rounded movement
        const startIndex = gestureStartIndexRef.current;
        const dx = gestureState.dx;
        const vx = gestureState.vx;

        // consider velocity for flicking: add small bias
        const movedPages = - (dx + vx * 60) / windowWidth;
        let targetIndex = Math.round(startIndex + movedPages);

        // clamp
        targetIndex = Math.max(0, Math.min(TAB_ICONS.length - 1, targetIndex));

        // animate to target and update state through handleTabPress (keeps icons/notch in sync)
        handleTabPress(targetIndex);
      },

      onPanResponderTerminate: () => {
        isDraggingRef.current = false;
        // revert to current selectedIndex
        handleTabPress(selectedIndexRef.current);
      },
    })
  ).current;

  // translate so notch centers on icon: left + (tabWidth/2 - CIRCLE_SIZE/2)
  const circleCenterOffset = useRef(new Animated.Value(tabWidth / 2 - CIRCLE_SIZE / 2)).current;
  const notchTranslateX = Animated.add(highlightAnim, circleCenterOffset);

  // add this after your other refs/consts (no change to notchTranslateX creation)
  const AnimatedSvg = Animated.createAnimatedComponent(Svg);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        {/* added header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 12 }}>
          <Text style={{ fontSize: 28, fontWeight: "700" }}>CardTraders</Text>
          <Text style={{ fontSize: 14, marginTop: 8, color: "#6b7280" }}>
            쉽고 안전한 카드 거래
          </Text>
        </View>

        {/* content area: pages laid out horizontally and translated to create slide */}
        <Animated.View
          {...panResponder.panHandlers}
          style={{
            flex: 1,
            height: "100%", // ensure children can take full height
            flexDirection: "row",
            width: windowWidth * TAB_ICONS.length,
            transform: [{ translateX: contentTranslate }],
          }}
        >
          <View style={{ width: windowWidth, flex: 1 }}>{/* 0 */}<SellerPage /></View>
          <View style={{ width: windowWidth, flex: 1 }}>{/* 1 */}<BuyerPage setSelectedCard={setSelectedCard} /></View>
          <View style={{ width: windowWidth, flex: 1 }}>{/* 2 */}<AnalyticsPage /></View>
        </Animated.View>
      </View>

      {/* Tab Bar */}
      <View
        style={[
          styles.tabBar,
          {
            height: TAB_BAR_HEIGHT + insets.bottom,
            paddingBottom: Math.max(insets.bottom, 12),
            paddingHorizontal: horizontalPadding, // use same padding value as used to compute tabWidth
            backgroundColor: TAB_BACKGROUND,
            borderTopWidth: TAB_BORDER_WIDTH,
            borderTopColor: TAB_BORDER_COLOR,
          },
        ]}
      >
        {/* top notch (SVG) wrapped in Animated.View so translateX actually animates
            adjusted SVG height/viewBox so stroke (border) is fully visible even when TAB_BORDER_WIDTH is large */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            // keep the position you liked — do NOT change this
            top: -CIRCLE_SIZE / 2 + TAB_BORDER_WIDTH / 2 + 15,
            // make the container taller to accommodate the full stroke (half circle + stroke)
            width: CIRCLE_SIZE,
            height: CIRCLE_SIZE / 2 + TAB_BORDER_WIDTH,
            transform: [{ translateX: notchTranslateX }],
            zIndex: 10,
            overflow: "visible",
          }}
        >
          {(() => {
            const half = CIRCLE_SIZE / 2;
            const strokeOffset = TAB_BORDER_WIDTH / 2;
            const svgHeight = half + TAB_BORDER_WIDTH; // extra space for stroke
            const baseline = half + strokeOffset; // path y where the arc is drawn (centered with stroke)
            return (
              <Svg
                width={CIRCLE_SIZE}
                height={svgHeight}
                viewBox={`0 0 ${CIRCLE_SIZE} ${svgHeight}`}
                preserveAspectRatio="xMinYMin slice"
              >
                {/* draw the semicircle stroke (top half)
                    baseline positioned lower inside viewBox so stroke doesn't get clipped */}
                <Path
                  d={`M 0 ${baseline} A ${half} ${half} 0 0 1 ${CIRCLE_SIZE} ${baseline}`}
                  fill={TAB_BACKGROUND}
                  stroke={TAB_BORDER_COLOR}
                  strokeWidth={TAB_BORDER_WIDTH}
                  strokeLinecap="butt"
                />
              </Svg>
            );
          })()}
        </Animated.View>

        {/* WHITE OVERLAY RECTANGLE
            This sits between the semicircle (notch) and the icons.
            It has no border, matches the tabBar bounds, and does not block touches (pointerEvents="none").
            zIndex is between the notch (10) and icons (30+), so it clips the semicircle stroke where it meets the tab bar. */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0, // fills the tabBar container (including safe area padding)
            backgroundColor: TAB_BACKGROUND,
            zIndex: 15,
          }}
        />

        {TAB_ICONS.map((tab, idx) => {
          // icon scale and translateY driven by selectedIndexAnim
          const scale = selectedIndexAnim.interpolate({
            inputRange: [idx - 1, idx, idx + 1],
            outputRange: [1, 1.35, 1],
            extrapolate: "clamp",
          });
          // move up when scaled so bottom edge stays aligned
          const translateY = selectedIndexAnim.interpolate({
            inputRange: [idx - 1, idx, idx + 1],
            outputRange: [0, -((LARGE_ICON_SIZE - SMALL_ICON_SIZE) / 2), 0],
            extrapolate: "clamp",
          });
          const isSelected = idx === selectedIndex;

          return (
            <Pressable
              key={tab.key}
              onPress={() => handleTabPress(idx)}
              style={[
                styles.tabButton,
                { height: TAB_BAR_HEIGHT, width: tabWidth, zIndex: 30 },
              ]}
            >
              <View
                style={{
                  width: tabWidth,
                  height: TAB_BAR_HEIGHT,
                  justifyContent: "flex-end",
                  alignItems: "center",
                }}
              >
                <Animated.View
                  style={{
                    justifyContent: "center",
                    alignItems: "center",
                    transform: [{ translateY }, { scale }],
                    zIndex: 40,
                    elevation: 40,
                  }}
                >
                  {tab.logo ? (
                    <Image
                      source={tab.logo}
                      style={{
                        width: SMALL_ICON_SIZE + 10,
                        height: SMALL_ICON_SIZE + 10,
                        resizeMode: "contain",
                        marginTop: 18,
                      }}
                    />
                  ) : (
                    <Icon
                      name={tab.iconName!}
                      size={SMALL_ICON_SIZE}
                      color={isSelected ? "#f93414" : "#222"}
                    />
                  )}
                </Animated.View>
              </View>
            </Pressable>
          );
        })}
      </View>

      <CardDetailModal
        visible={!!selectedCard}
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  content: { flex: 1 },
  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    overflow: "visible",
    alignItems: "flex-end",
  },
  tabButton: {
    justifyContent: "flex-end",
    alignItems: "center",
    zIndex: 3,
    overflow: "hidden",
  },
});
