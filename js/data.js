/* =========================================================
   커피 러시 - 바뀌지 않는 정보
   재료 · 재료판 · 음료 카드
   ========================================================= */


/* ===== 1. 재료 정보 =====
   name  : 화면에 보이는 이름
   color : 재료판 칸 테두리 색
   img   : logo/재료토큰 폴더의 아이콘 파일
   special: true면 스페셜 재료 (칸 모서리에 노란 리본)
   big   : true면 아이콘을 조금 키움 (SVG 둘레 여백이 큰 것) */
const ICON = '../logo/재료토큰/';

const ITEMS = {
  coffee:    { name: '원두',   color: '#2A211D', img: 'coffee_beans.png' },
  milk:      { name: '우유',   color: '#CBB79F', img: 'milk_drop.png' },
  steam:     { name: '스팀',   color: '#D8352B', img: 'steam.svg', big: true },
  ice:       { name: '얼음',   color: '#8CCBEF', img: 'ice.png' },
  caramel:   { name: '카라멜', color: '#E87A2C', img: 'caramel.svg',   special: true },
  tea:       { name: '찻잎',   color: '#3E9B43', img: 'tea-leaf.png',  special: true },
  water:     { name: '물',     color: '#2F74C8', img: 'water_drop.png', special: true },
  chocolate: { name: '초콜릿', color: '#5A2A1B', img: 'chocolate.svg', special: true, big: true },
};


/* ===== 2. 재료판 (원작 그대로 고정) =====
   왼쪽 위부터 한 줄씩. 칸 번호는 0 ~ 15 */
const BOARD = [
  'ice',    'caramel', 'steam',     'coffee',
  'coffee', 'milk',    'ice',       'water',
  'tea',    'steam',   'milk',      'coffee',
  'milk',   'ice',     'chocolate', 'steam',
];


/* ===== 3. 음료 카드 (원작 33종 · 모두 80장) =====
   items  : 컵에 담아야 하는 재료 (순서는 상관없음)
   copies : 주문 더미에 들어가는 장수
   special: true면 스페셜 메뉴 (처리하면 러시 토큰 1개)
   레시피는 원작 카드 그대로 (2026-10-07 받은 목록) */
const MENUS = [
  // 기본 메뉴 · 따뜻한 음료
  { name: '에스프레소',               items: ['coffee', 'steam'],                       copies: 2 },
  { name: '리스트레토',               items: ['coffee', 'steam'],                       copies: 2 },
  { name: '에스프레소 도피오',           items: ['coffee', 'coffee', 'steam'],             copies: 4 },
  { name: '아메리카노',               items: ['coffee', 'water', 'steam'],              copies: 3 },
  { name: '카페 라테',               items: ['coffee', 'milk', 'steam'],               copies: 2 },
  { name: '라테 마키아토',             items: ['coffee', 'milk', 'steam'],               copies: 2 },
  { name: '콘 파냐',                items: ['coffee', 'milk', 'steam'],               copies: 2 },
  { name: '아인슈페너',               items: ['coffee', 'milk', 'steam'],               copies: 2 },
  { name: '밀크티',                 items: ['tea', 'milk', 'steam'],                  copies: 3 },
  { name: '코코아',                 items: ['chocolate', 'milk', 'steam'],            copies: 2 },
  { name: '초코라테',                items: ['chocolate', 'milk', 'steam'],            copies: 2 },
  // 기본 메뉴 · 아이스 음료
  { name: '아이스 아메리카노',           items: ['coffee', 'water', 'ice'],                copies: 3 },
  { name: '아이스 카페 라테',           items: ['coffee', 'milk', 'ice'],                 copies: 2 },
  { name: '아이스 아인슈페너',           items: ['coffee', 'milk', 'ice'],                 copies: 2 },
  { name: '콜드 브루',               items: ['coffee', 'water', 'ice'],                copies: 2 },
  { name: '아이스 밀크티',             items: ['tea', 'milk', 'ice'],                    copies: 3 },
  { name: '아이스 코코아',             items: ['chocolate', 'milk', 'ice'],              copies: 2 },
  { name: '아이스 초코라테',            items: ['chocolate', 'milk', 'ice'],              copies: 2 },
  { name: '카라멜 카페 프레도',          items: ['coffee', 'caramel', 'ice'],              copies: 6 },
  { name: '초코 쉐이크',              items: ['chocolate', 'milk', 'ice'],              copies: 2 },
  // 스페셜 메뉴 (처리하면 러시 토큰 1개)
  { name: '카페 모카',               items: ['coffee', 'chocolate', 'milk', 'steam'],  copies: 2, special: true },
  { name: '모카치노',                items: ['coffee', 'chocolate', 'milk', 'steam'],  copies: 2, special: true },
  { name: '카라멜 마키아토',            items: ['coffee', 'caramel', 'milk', 'steam'],    copies: 2, special: true },
  { name: '카라멜 카페라테',            items: ['coffee', 'caramel', 'milk', 'steam'],    copies: 2, special: true },
  { name: '녹차',                  items: ['tea', 'water', 'steam'],                 copies: 3, special: true },
  { name: '홍차',                  items: ['tea', 'water', 'steam'],                 copies: 3, special: true },
  { name: '아이스 카페 모카',           items: ['coffee', 'chocolate', 'milk', 'ice'],    copies: 2, special: true },
  { name: '아이스 모카치노',            items: ['coffee', 'chocolate', 'milk', 'ice'],    copies: 2, special: true },
  { name: '아이스 카라멜 마키아토',        items: ['coffee', 'caramel', 'milk', 'ice'],      copies: 2, special: true },
  { name: '아이스 카라멜 카페라테',        items: ['coffee', 'caramel', 'milk', 'ice'],      copies: 2, special: true },
  { name: '아이스 녹차',              items: ['tea', 'water', 'ice'],                   copies: 3, special: true },
  { name: '아이스 홍차',              items: ['tea', 'water', 'ice'],                   copies: 3, special: true },
  { name: '카라멜 프라페',             items: ['coffee', 'caramel', 'milk', 'ice'],      copies: 2, special: true },
];


/* ===== 4. 업그레이드 4종 =====
   처리한 주문 카드 3장을 버리고 1개를 켬 (차례 시작 때만, 한 차례에 1개)
   켜면 게임 끝까지 유지 · 1개당 +2점 */
// 개인 판 위에서 아래 순서 (원작 판과 같음). 켜는 순서는 플레이어 마음대로
const UPGRADES = [
  { key: 'pawn',     name: '게임 말 ×2',    desc: '상대 말 칸을 지나가면 재료 2개' },
  { key: 'diagonal', name: '대각선 이동',   desc: '대각선으로도 움직여요' },
  { key: 'corner',   name: '꼭짓점 ×2',     desc: '네 모서리 칸에서 재료 2개' },
  { key: 'special',  name: '스페셜 재료 ×2', desc: '노란 띠 칸에서 재료 2개' },
];

// 네 모서리 칸 번호
const CORNERS = [0, 3, 12, 15];
