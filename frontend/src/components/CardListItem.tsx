import React, { useMemo, useState } from "react";
import { View, Text, Image, StyleSheet, Pressable, Alert } from "react-native";
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/store/useAuth';
import { updateProfileApi } from '@/api/client';

type Props = {
  id?: string | number;
  imageUrl: string;
  title: string;
  description: string;
  price: number;
  sellerAddress?: string;
  uploadDate?: string; // ISO string
  onPress?: () => void;
  favorited?: boolean;
};

function formatDate(iso?: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${y}.${m}.${day}`;
  } catch {
    return "";
  }
}

export default function CardListItem({ id, imageUrl, title, description, price, sellerAddress, uploadDate, onPress, favorited }: Props) {
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const [loadingFav, setLoadingFav] = useState(false);
  const cardId = useMemo(() => {
    return id != null ? String(id) : `${title}:${price}`;
  }, [id, title, price]);

  const isStarred = useMemo(() => {
    // If parent explicitly passed favorited, prefer that (fast path on lists)
    if (typeof favorited === 'boolean') return favorited;
    try {
      const arr: string[] = (user?.favorites ?? user?.starred_item ?? []) as string[];
      return !!arr.find((s: string) => String(s) === String(cardId));
    } catch {
      return false;
    }
  }, [user, cardId]);

  const toggleStar = async () => {
    if (!user) {
      Alert.alert('로그인 필요', '즐겨찾기를 사용하려면 로그인하세요.');
      return;
    }
    setLoadingFav(true);
    // optimistic update
  const prev = { ...user } as typeof user;
  const curArr = Array.isArray(user.favorites) ? [...user.favorites] : (Array.isArray(user.starred_item) ? [...user.starred_item] : []);
    const existed = curArr.find((s) => String(s) === String(cardId));
    let nextArr: string[];
    if (existed) {
      nextArr = curArr.filter((s) => String(s) !== String(cardId));
    } else {
      nextArr = [...curArr, String(cardId)];
    }
  // update local store first (optimistic)
  setUser({ ...user, favorites: nextArr, starred_item: nextArr });
    try {
      const payload: any = { id: user.id || null, userId: user.userId, favorites: nextArr };
      const resp = await updateProfileApi(payload);
      // persist returned user but keep our optimistic favorites if server didn't echo them
      const serverUser = resp?.user ?? null;
      if (serverUser) {
        const serverFavs = Array.isArray(serverUser.favorites)
          ? serverUser.favorites.map(String)
          : (Array.isArray(serverUser.starred_item) ? serverUser.starred_item.map(String) : []);
        // prefer our nextArr (client intent) so the UI stays filled until user toggles again
        const mergedFavs = nextArr;
        setUser({ ...serverUser, favorites: mergedFavs, starred_item: mergedFavs });
      } else {
        // fallback: keep optimistic state
        setUser({ ...user, favorites: nextArr, starred_item: nextArr });
      }
    } catch (e: any) {
      // revert
      setUser(prev);
      Alert.alert('오류', e?.message || '즐겨찾기 변경에 실패했습니다.');
    } finally {
      setLoadingFav(false);
    }
  };
  return (
    <View style={styles.container}>
      <Pressable style={styles.starBtn} onPress={toggleStar} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <MaterialIcons name={isStarred ? 'star' : 'star-border'} size={22} color={isStarred ? '#F59E0B' : '#9CA3AF'} />
      </Pressable>
      <Pressable style={styles.contentPress} onPress={onPress}>
        <View style={styles.contentInner}>
          <View style={styles.imageWrapper}>
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          </View>
          <View style={styles.textWrapper}>
            <View style={styles.topBlock}>
              <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
                {title}
              </Text>
              <View style={styles.priceWrapper}>
                <Text style={styles.price}>{`${price.toLocaleString()}원`}</Text>
              </View>
            </View>
            <View style={styles.bottomMetaRow}>
              {!!(sellerAddress || uploadDate) && (
                <Text style={styles.metaText} numberOfLines={1} ellipsizeMode="tail">
                  {`${sellerAddress || ""}${sellerAddress && uploadDate ? " · " : ""}${formatDate(uploadDate)}`}
                </Text>
              )}
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    // shadow for iOS (all around) and Android (elevation)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 }, // center shadow so it drops evenly on all sides
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    marginVertical: 8,
    marginHorizontal: 16, // side margins so items don't touch screen edges
  overflow: "visible", // ensure shadow visible
  },
  content: {
    flexDirection: "row",
  backgroundColor: "#FAF9F6",
    borderRadius: 16,
    overflow: "hidden", // clip children to rounded corners
    minHeight: 130,
    alignItems: "stretch",
  },
  contentPress: {
    borderRadius: 16,
    overflow: "hidden",
  },
  contentInner: {
    flexDirection: "row",
    backgroundColor: "#FAF9F6",
    borderRadius: 16,
    minHeight: 130,
    alignItems: "stretch",
  },
  // star button floats at top-right
  starBtn: {
  position: 'absolute',
  right: 10,
    top: 8,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  imageWrapper: {
    width: 110,
    alignSelf: "stretch",
    backgroundColor: "#f3f3f3",
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
  },
  image: {
    width: "100%",
    height: "100%",
    flex: 1,
  },
  textWrapper: {
    flex: 1,
    justifyContent: "space-between",
    padding: 12,
  },
  topBlock: {
    // stacks title and price
  },
  title: {
    fontSize: 20,
  fontFamily: 'GothicA1_400Regular',
    textAlign: "left",
    paddingLeft: 4,
  },
  priceWrapper: {
    alignItems: "flex-start",
    justifyContent: "flex-start",
    marginTop: 6,
  },
  price: {
    fontSize: 20,
    fontWeight: "300",
    color: "#007AFF",
  paddingLeft: 4,
  },
  bottomMetaRow: {
    // bottom-left meta line
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
    paddingLeft: 4,
  },
});