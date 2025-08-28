// Centralized dummy data for development.
// Update here to reflect across Buyer and Analytics pages.

// Sports card specific metadata
export type OriginalOrLicensed = "original" | "licensed reprint";

export interface SportsCardInfo {
  autographedBy?: string;
  playerAthlete?: string;
  cardCaseType?: string;
  sportType?: string;
  language?: string;
  manufacturer?: string;
  team?: string;
  player?: string;
  printRun?: string | number;
  rarity?: string;
  year?: number;
  cardSize?: string;
  set?: string;
  autographFormat?: string;
  yearManufactured?: number;
  vintage?: boolean;
  parallelOrVariety?: string;
  autographAuthentication?: string;
  league?: string;
  originalOrLicensedReprint?: OriginalOrLicensed;
  type?: string;
  cardNumber?: string | number;
  grade?: string;
  certificationNumber?: string;
  professionalGrader?: string;
}

// Pokemon card specific metadata
export interface PokemonCardInfo {
  condition?: string; // 상태
  game?: string; // 게임 (e.g., Pokemon TCG)
  cardName?: string; // 카드 이름
  character?: string; // 캐릭터
  set?: string; // 세트
  features?: string | string[]; // 특징
  cardType?: string; // 카드 유형
  rarity?: string; // 희귀도
  finish?: string; // 마감(피니시)
  yearManufactured?: number; // 제작 연도
  cardNumber?: string | number; // 카드 번호
  language?: string; // 언어
  variants?: string | string[]; // 변형(Variants)
  cardId?: string; // 카드 ID (e.g., TCGdex id)
  grading?: string; // 그레이딩 (미입력시 빈 값)
}

// Yu-Gi-Oh card specific metadata
export interface YugiohCardInfo {
  condition?: string; // 상태
  cardSize?: string; // 카드 크기
  set?: string; // 세트
  yearManufactured?: number; // 제작 연도
  vintage?: boolean; // 빈티지
  rarity?: string; // 희귀도
  cardName?: string; // 카드 이름
  manufacturer?: string; // 제조사
  features?: string | string[]; // 특징
  cardType?: string; // 카드 유형
  cardNumber?: string | number; // 카드 번호
  countryOfManufacture?: string; // 제조 국가/지역
  finish?: string; // 마감
}

export type CardItem = {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  price: number;
  category: "pokemon" | "yugioh" | "sports";
  data: number[];
  // ISO datetime string recording when the card was uploaded
  uploadDate?: string;
  sports?: SportsCardInfo; // present for sports category items
  pokemon?: PokemonCardInfo; // present for pokemon category items
  yugioh?: YugiohCardInfo; // present for yugioh category items
};

export const CATEGORIES = [
  { key: "all", label: "전체" },
  { key: "pokemon", label: "포켓몬" },
  { key: "yugioh", label: "유희왕" },
  { key: "sports", label: "스포츠" },
];

export const cards: CardItem[] = [
  {
    id: "1",
    imageUrl: "https://placehold.co/100x130",
    title: "블랙 로터스",
    description: "매직 더 개더링의 전설적인 카드입니다.",
    price: 1000000,
    category: "yugioh",
  uploadDate: "2025-08-18T10:15:00.000Z",
    data: Array.from({ length: 30 }, (_, i) => 1000 + Math.round(Math.sin(i / 3) * 50 + i * 2)),
    yugioh: {
      condition: "Lightly Played",
      cardSize: "Standard",
      set: "Alpha",
      yearManufactured: 1993,
      vintage: true,
      rarity: "Legendary",
      cardName: "Black Lotus",
      manufacturer: "Wizards of the Coast",
      features: ["Foil", "1st Edition"],
      cardType: "Artifact",
      cardNumber: "233",
      countryOfManufacture: "USA",
      finish: "Holofoil",
    },
  },
  {
    id: "2",
    imageUrl: "https://placehold.co/100x130",
    title: "피카츄 GX",
    description: "포켓몬 카드, 한정판.",
    price: 350000,
    category: "pokemon",
  uploadDate: "2025-08-19T14:30:00.000Z",
    data: Array.from({ length: 30 }, (_, i) => 600 + Math.round(Math.sin(i / 5) * 20 + i * 0.5)),
    pokemon: {
      condition: "Near Mint",
      game: "Pokemon TCG",
      cardName: "Pikachu GX",
      character: "Pikachu",
      set: "Sun & Moon",
      features: ["Holo", "GX"],
      cardType: "Electric",
      rarity: "Ultra Rare",
      finish: "Holofoil",
      yearManufactured: 2017,
  cardNumber: "SM-P",
  // New fields to mirror Seller preview mapping
  language: "en",
  variants: ["holo", "reverseHolo"],
  cardId: "sm-promos-SM-P",
  // grading left blank intentionally for now
    },
  },
  {
    id: "3",
    imageUrl: "https://placehold.co/100x130",
    title: "레드 아이즈 블랙 드래곤",
    description: "유희왕 인기 카드, 상태 양호.",
    price: 180000,
    category: "yugioh",
  uploadDate: "2025-08-19T22:05:00.000Z",
    data: Array.from({ length: 30 }, (_, i) => 800 + Math.round(Math.cos(i / 4) * 30 + i)),
    yugioh: {
      condition: "Near Mint",
      cardSize: "Standard",
      set: "Legend of Blue Eyes White Dragon",
      yearManufactured: 2002,
      vintage: true,
      rarity: "Ultra Rare",
      cardName: "Red-Eyes B. Dragon",
      manufacturer: "Konami",
      features: ["Holo", "1st Edition"],
      cardType: "Dragon/Normal",
      cardNumber: "LOB-070",
      countryOfManufacture: "Japan",
      finish: "Holofoil",
    },
  },
  {
    id: "4",
    imageUrl: "https://placehold.co/100x130",
    title: "야구 카드 레전드",
    description: "스포츠 카드, 소장가치 높음.",
    price: 500000,
    category: "sports",
  uploadDate: "2025-08-20T08:45:00.000Z",
    data: Array.from({ length: 30 }, (_, i) => 1200 + Math.round(Math.cos(i / 6) * 40 - i)),
    sports: {
      autographedBy: "홍길동",
      playerAthlete: "홍길동",
      cardCaseType: "Toploader",
      sportType: "Baseball",
      language: "Korean",
      manufacturer: "Topps",
      team: "Seoul Tigers",
      player: "홍길동",
      printRun: 500,
      rarity: "Rare",
      year: 1998,
      cardSize: "Standard",
      set: "Legends Series",
      autographFormat: "On-Card",
      yearManufactured: 1998,
      vintage: true,
      parallelOrVariety: "Gold Foil",
      autographAuthentication: "PSA/DNA",
      league: "KBO",
      originalOrLicensedReprint: "original",
      type: "Sports Trading Card",
      cardNumber: "#27",
      grade: "PSA 9",
      certificationNumber: "1234567890",
      professionalGrader: "PSA",
    },
  },
  {
    id: "5",
    imageUrl: "https://placehold.co/100x130",
    title: "다크 매지션",
    description: "유희왕 대표 카드, 소장용 추천.",
    price: 220000,
    category: "yugioh",
  uploadDate: "2025-08-20T18:20:00.000Z",
    data: Array.from({ length: 30 }, (_, i) => 420 + Math.round(Math.sin(i / 2) * 25 + i)),
    yugioh: {
      condition: "Excellent",
      cardSize: "Standard",
      set: "Starter Deck: Yugi",
      yearManufactured: 2002,
      vintage: true,
      rarity: "Super Rare",
      cardName: "Dark Magician",
      manufacturer: "Konami",
      features: ["Holo"],
      cardType: "Spellcaster/Normal",
      cardNumber: "SDY-006",
      countryOfManufacture: "Japan",
      finish: "Holofoil",
    },
  },
];
