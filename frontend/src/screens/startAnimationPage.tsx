import React, { useEffect, useRef } from 'react';
import { View, Animated, Image, StyleSheet, StatusBar } from 'react-native';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../store/useAuth';

function StartAnimationPage({ onFinish }: { onFinish?: ()=>void }){
  const nav = useNavigation<any>();
  const user = useAuth((s)=>s.user);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  useEffect(()=>{
    // sequence: fade/move in, hold, fade out -> navigate
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
      Animated.delay(500),
      Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start(()=>{
      // call host callback so navigation root can hide Start next time
      try { onFinish && onFinish(); } catch(e){}
      // navigate to Login or Home depending on auth
      if (user) nav.reset({ index: 0, routes: [{ name: 'Home' }] });
      else nav.reset({ index: 0, routes: [{ name: 'Login' }] });
    });
  }, [nav, user, opacity, translateY]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Animated.View style={[styles.logoWrap, { opacity, transform: [{ translateY }] }] }>
        <Image source={require('../assets/CardTradersLogo_Original.png')} style={styles.logo} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  logoWrap: { alignItems: 'center', justifyContent: 'center' },
  logo: { width: 240, height: 90, resizeMode: 'contain' },
});

export default StartAnimationPage;
export { StartAnimationPage };
