import React, { useState } from "react";
import { View, Text, Image, StyleSheet, LayoutChangeEvent } from "react-native";
import Svg, { Path, Line } from "react-native-svg";

type Props = {
  imageUrl: string;
  title: string;
  data?: number[];
  graphWidth?: number;
  graphHeight?: number;
};

// add vertical padding so graph doesn't touch top/bottom borders
// added `gapPct` to provide leisure space beyond actual min/max so line never touches axis
function makeSparklinePath(
  values: number[],
  w: number,
  h: number,
  paddingY = 6,
  paddingX = 0,
  gapPct = 0.06
) {
  if (!values || values.length === 0 || w <= 0 || h <= 0) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);

  // determine gap to leave above max / below min
  let gap: number;
  if (max === min) {
    // if flat line, choose a small absolute gap so it doesn't sit on axis
    gap = Math.abs(max) * gapPct || 1;
  } else {
    gap = (max - min) * gapPct;
  }

  const effMin = min - gap;
  const effMax = max + gap;
  const range = effMax - effMin || 1;

  // inner drawing area
  const innerW = Math.max(1, w - paddingX * 2);
  const innerH = Math.max(1, h - paddingY * 2);
  const stepX = innerW / Math.max(1, values.length - 1);

  const points = values.map((v, i) => {
    const x = paddingX + i * stepX;
    // invert y: higher value -> smaller y (use effective min/max)
    const y = paddingY + (innerH - ((v - effMin) / range) * innerH);
    return { x, y };
  });

  // build path
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)}`;
  }
  return d;
}

export default function AnalyticsCardListItem({
  imageUrl,
  title,
  data = [],
  graphWidth = 160,
  graphHeight = 40,
}: Props) {
  // column reserved for axis labels (outside SVG) so labels won't be clipped
  const LABEL_COL_WIDTH = 44;

  // localGraphWidth will be measured from layout so the sparkline fills the available space
  const [localGraphWidth, setLocalGraphWidth] = useState<number>(Math.max(0, graphWidth - LABEL_COL_WIDTH));

  const onTextWrapperLayout = (e: LayoutChangeEvent) => {
    const totalWidth = e.nativeEvent.layout.width;
    // reserve label column on the left so labels are visible
    const avail = Math.max(0, totalWidth - LABEL_COL_WIDTH);
    setLocalGraphWidth(avail);
  };

  // padding inside the SVG so min/max points don't touch edges
  const GRAPH_PADDING_Y = 8; // space from top and bottom
  const GRAPH_PADDING_X = 8; // horizontal inset so line doesn't touch side edges
  const GRAPH_GAP_PCT = 0.08; // leisure gap percentage for min/max

  // inner dims used for drawing grid/axis and baseline
  const innerW = Math.max(0, localGraphWidth - GRAPH_PADDING_X * 2);
  const innerH = Math.max(0, graphHeight - GRAPH_PADDING_Y * 2);
  const baselineY = GRAPH_PADDING_Y + innerH; // bottom inside padding

  const path = makeSparklinePath(
    data,
    localGraphWidth,
    graphHeight,
    GRAPH_PADDING_Y,
    GRAPH_PADDING_X,
    GRAPH_GAP_PCT
  );

  // compute trend color (green if last > first else red)
  const trendColor =
    data.length >= 2 && data[data.length - 1] >= data[0] ? "#10B981" : "#EF4444";

  const gridColor = "#eef2f7";
  const axisColor = "#e5e7eb";
  const GRID_ROWS = 3; // number of horizontal grid lines (including top/bottom if desired)

  // compute numeric labels for axis (original min/max shown)
  const minVal = data && data.length ? Math.min(...data) : 0;
  const maxVal = data && data.length ? Math.max(...data) : 0;
  const midVal = (minVal + maxVal) / 2;
  const fmt = (v: number) => (Number.isFinite(v) ? Math.round(v).toLocaleString() : "0");

  return (
    <View style={styles.container}>
      <View style={styles.imageWrapper}>
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
      </View>

      <View style={styles.textWrapper} onLayout={onTextWrapperLayout}>
        <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
          {title}
        </Text>

        {/* graph row: left = label column (fixed), right = svg (flex) */}
        <View style={[styles.graphRow, { height: graphHeight }]}>
          <View style={{ width: LABEL_COL_WIDTH, height: graphHeight, justifyContent: "space-between", paddingTop: GRAPH_PADDING_Y }}>
            <Text style={styles.axisLabel}>{fmt(maxVal)}</Text>
            <Text style={[styles.axisLabel, { textAlign: "right" }]}>{fmt(midVal)}</Text>
            <Text style={[styles.axisLabel, { textAlign: "right" }]}>{fmt(minVal)}</Text>
          </View>

          <Svg width={localGraphWidth} height={graphHeight} accessible accessibilityLabel="30 day sparkline">
            {/* draw horizontal grid lines */}
            {Array.from({ length: GRID_ROWS + 1 }).map((_, i) => {
              const y = GRAPH_PADDING_Y + (innerH * i) / GRID_ROWS;
              return (
                <Line
                  key={`g-${i}`}
                  x1={GRAPH_PADDING_X}
                  x2={Math.max(localGraphWidth - GRAPH_PADDING_X, GRAPH_PADDING_X)}
                  y1={y}
                  y2={y}
                  stroke={gridColor}
                  strokeWidth={1}
                />
              );
            })}

            {/* left vertical axis */}
            <Line
              x1={GRAPH_PADDING_X}
              x2={GRAPH_PADDING_X}
              y1={GRAPH_PADDING_Y}
              y2={baselineY}
              stroke={axisColor}
              strokeWidth={1}
            />

            {/* bottom axis (x-axis) */}
            <Line
              x1={GRAPH_PADDING_X}
              x2={Math.max(localGraphWidth - GRAPH_PADDING_X, GRAPH_PADDING_X)}
              y1={baselineY}
              y2={baselineY}
              stroke={axisColor}
              strokeWidth={1}
            />

            {/* area fill under curve */}
            <Path
              d={path ? `${path} L ${GRAPH_PADDING_X + innerW} ${baselineY} L ${GRAPH_PADDING_X} ${baselineY} Z` : ""}
              fill={path ? "rgba(16,185,129,0.06)" : "transparent"}
            />
            {/* sparkline stroke */}
            {path ? (
              <Path d={path} fill="none" stroke={trendColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            ) : null}
          </Svg>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // keep visual style consistent with CardListItem
  container: {
    flexDirection: "row",
    borderRadius: 16,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    padding: 12,
    marginVertical: 8,
    marginHorizontal: 16,
    alignItems: "center",
    overflow: "visible",
  },
  imageWrapper: {
    width: 100,
    height: 130,
    marginRight: 12,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f3f3f3",
  },
  image: {
    width: "100%",
    height: "100%",
  },

  textWrapper: {
    flex: 1,
    justifyContent: "space-between", // match CardListItem
    height: 120, // match CardListItem
    paddingRight: 8,
  },
  title: {
    fontSize: 20, // same as CardListItem
    fontWeight: "700",
    textAlign: "left",
    paddingLeft: 10, // same as CardListItem
  },
  graphRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10,
  },
  axisLabel: {
    color: "#6b7280",
    fontSize: 10,
    textAlign: "right",
  },
});