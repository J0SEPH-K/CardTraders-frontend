import React, { useRef, useState } from 'react';
import { View, Modal, FlatList, Image, StyleSheet, Text, Pressable, Dimensions } from 'react-native';

type Props = {
  images: string[];
  visible: boolean;
  onClose: () => void;
};

export default function ImageBundleViewer({ images, visible, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const fl = useRef<FlatList<string>>(null as any);
  const width = Dimensions.get('window').width;

  const onViewable = ({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) setIndex(viewableItems[0].index || 0);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouchable} onPress={onClose} />
        <View style={styles.container}>
          <FlatList
            ref={fl}
            data={images}
            horizontal
            pagingEnabled
            keyExtractor={(it, i) => `${i}`}
            renderItem={({ item }) => (
              <View style={[styles.imageWrap, { width }]}> 
                <Image source={{ uri: item }} style={[styles.image, { width }]} />
              </View>
            )}
            onViewableItemsChanged={onViewable}
            showsHorizontalScrollIndicator={false}
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
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  backdropTouchable: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  container: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  imageWrap: { justifyContent: 'center', alignItems: 'center' },
  image: { height: '80%', resizeMode: 'contain' },
  dots: { position: 'absolute', bottom: 48, flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)', marginHorizontal: 4 },
  dotActive: { backgroundColor: '#f93414' },
  closeBtn: { position: 'absolute', top: 48, right: 20, backgroundColor: 'rgba(255,255,255,0.9)', padding: 8, borderRadius: 8 }
});
