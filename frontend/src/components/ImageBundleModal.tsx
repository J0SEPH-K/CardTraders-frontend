import React, { useRef, useState } from 'react';
import { View, Modal, FlatList, Image, StyleSheet, Dimensions, Animated, Pressable, Text } from 'react-native';

const { width, height } = Dimensions.get('window');

type Props = {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose?: () => void;
};

export default function ImageBundleModal({ visible, images, initialIndex = 0, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const listRef = useRef<FlatList<string>>(null);

  const handleScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / width);
    setIndex(i);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouchable} onPress={onClose} />
        <View style={styles.container} pointerEvents="box-none">
          <FlatList
            ref={listRef}
            data={images}
            horizontal
            pagingEnabled
            initialScrollIndex={initialIndex}
            keyExtractor={(s, i) => `${i}`}
            onScroll={handleScroll}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.page}>
                <Image source={{ uri: item }} style={styles.image} />
              </View>
            )}
          />

          <View style={styles.dots}>
            {images.map((_, i) => (
              <View key={i} style={[styles.dot, i === index ? styles.dotActive : undefined]} />
            ))}
          </View>
          <Pressable style={styles.closeBtn} onPress={onClose}><Text style={{ color: '#111', fontWeight: '700' }}>닫기</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  backdropTouchable: { ...StyleSheet.absoluteFillObject },
  container: { width, height: height * 0.75, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  page: { width, height: height * 0.75, alignItems: 'center', justifyContent: 'center' },
  image: { width: width, height: height * 0.75, resizeMode: 'contain', backgroundColor: '#e5e7eb' },
  dots: { position: 'absolute', bottom: 22, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.6)', marginHorizontal: 4 },
  dotActive: { backgroundColor: '#f93414' },
  closeBtn: { position: 'absolute', top: 12, right: 12, padding: 8, backgroundColor: 'transparent' },
});
