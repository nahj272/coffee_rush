/* =========================================================
   커피 러시 - 게임 준비 · 상태
   - 닉네임 · 난이도
   - 주문 더미 만들기 · 새 게임 (원작 준비 규칙)
   - 말 놓기 순서 (AI 말 놓기 포함)
   - game: 지금 게임의 모든 정보
   ========================================================= */


/* ===== 0. 닉네임 =====
   구글 로그인한 사람만 닉네임을 정해서 "(닉네임) 바리스타"로 보임.
   로그인 기능을 만들면 여기에 닉네임이 들어가도록 연결할 예정.
   null이면 (게스트) "내 주문"으로 보임 */
let nickname = null;

/* ===== 0-2. 난이도 =====
   'easy' 쉬움 · 'normal' 보통 (세팅 화면에서 고름)
   나중에 로그인 기능을 만들면 로그인한 사람만 고를 수 있게 바꿀 예정
   쉬움: 러시 토큰 2개를 갖고 시작 + AI가 덜 꼼꼼하게 길을 고름 */
let mode = 'normal';


/* ===== 1. 무작위 도우미 ===== */

// 0 ~ (n-1) 중 하나
function rand(n) {
  return Math.floor(Math.random() * n);
}

// 배열 순서를 무작위로 섞기 (카드 섞기와 같음)
function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [list[i], list[j]] = [list[j], list[i]];   // i번과 j번 자리 바꾸기
  }
  return list;
}

// 주문 더미 만들기: 메뉴를 copies 장씩 넣고 섞음 (모두 80장)
function makeDeck() {
  const deck = [];
  MENUS.forEach((menu) => {
    for (let i = 0; i < menu.copies; i++) deck.push(menu);
  });
  return shuffle(deck);
}


/* ===== 2. 새 게임 시작 상태 (원작 준비 규칙)
   - 먼저 할 사람은 무작위
   - 처음 주문: 나와 AI 모두 1단 1장 · 2단 1장, 선플레이어만 1단에 1장 더
   - 말: 선플레이어가 먼저 놓음
     AI가 선이면 AI 말이 먼저 있고, 내가 선이면 내가 놓은 다음에 AI가 놓음
   - 말을 놓은 칸의 재료 1개를 컵에 담고 시작
   - 좋아요(처리) · 싫어요 · 러시 · 업그레이드는 모두 0 */
function newPlayer() {
  return {
    pawns: [],                 // 내 말이 있는 칸 번호
    queue: [[], [], [], []],   // 주문 1단 ~ 4단
    cups: [[], [], []],        // 컵 3개
    done: 0,                   // 처리한 주문 수
    doneList: [],              // 처리한 주문 카드 (화면 왼쪽에 보여줌)
    penalty: 0,                // 싫어요 (벌점)
    rush: 0,                   // 러시 토큰
    ups: [],                   // 켠 업그레이드 key 목록 (예: ['diagonal'])
  };
}

// AI 말 1개 놓기: 빈 칸 중에서 고르고, 그 칸의 재료 1개를 빈 컵에 담음
// 보통: AI 주문에 많이 들어가는 재료 칸 · 쉬움: 아무 칸
function placeAi(ai, me) {
  const free = [];
  for (let i = 0; i < 16; i++) {
    if (!me.pawns.includes(i) && !ai.pawns.includes(i)) free.push(i);
  }
  shuffle(free);

  if (mode === 'normal') {
    // 이 칸의 재료가 들어가는 AI 주문 수
    const want = (i) => ai.queue.flat().filter((o) => o.items.includes(BOARD[i])).length;
    free.sort((a, b) => want(b) - want(a));
  }

  ai.pawns.push(free[0]);
  const cup = ai.cups.findIndex((c) => c.length === 0);   // 빈 컵
  ai.cups[cup].push(BOARD[free[0]]);
}

// 말 놓는 순서 (2인 규칙: 말 2개씩, 선플레이어부터 번갈아 하나씩)
// 예: 내가 선 → ['me', 'ai', 'me', 'ai']
function placeOrder(first) {
  const second = first === 'me' ? 'ai' : 'me';
  return [first, second, first, second];
}

// AI가 놓을 차례면 놓고 다음으로 (내 차례가 올 때까지)
function placeAiTurns(g) {
  while (g.placeIdx < 4 && g.order[g.placeIdx] === 'ai') {
    placeAi(g.ai, g.me);
    g.placeIdx += 1;
  }
}

function newGame() {
  const deck = makeDeck();
  const me = newPlayer();
  const ai = newPlayer();

  // 먼저 할 사람(선플레이어): 반반 확률
  const first = rand(2) === 0 ? 'me' : 'ai';

  // 처음 주문: 모두 1단 1장 · 2단 1장, 선플레이어만 1단에 1장 더
  [me, ai].forEach((p) => {
    p.queue[0].push(deck.pop());   // 1단 1장
    p.queue[1].push(deck.pop());   // 2단 1장
  });
  (first === 'me' ? me : ai).queue[0].push(deck.pop());

  const g = {
    round: 1,
    first: first,   // 먼저 하는 사람
    turn: first,    // 지금 누구 차례인지: 'me' 또는 'ai'
    step: 0,        // 0 말 놓기 · 1 이동 · 2 재료 담기 · 3 주문 처리 · 4 차례 끝
    over: false,    // 게임이 끝났는지
    ending: false,  // 주문 더미가 빔 → 이번 라운드까지만 하고 끝 (싫어요 5장은 바로 끝)
    deck: deck,     // 남은 주문 더미
    me: me,
    ai: ai,
    path: [],       // 이번 차례에 지나온 칸 번호
    picks: [],      // 받았지만 아직 컵에 안 담은 재료
    picked: 0,      // 받은 재료 중 고른 것 (picks의 번호)
    setup: false,   // 시작 재료를 담는 중인지 (말 놓은 직후)
    table: true,    // 세팅 화면(테이블)을 보여주는 중인지 → OPEN(게임 시작)을 누르면 false
    placed: [],     // 이번 차례에 담은 컵 번호 (되돌리기용)
    upPick: null,   // 배너에서 고른 업그레이드 key
    upDone: false,  // 이번 차례에 업그레이드를 켰는지
    rushUse: 0,     // 이번 차례에 쓰려고 고른 러시 토큰 수 (+1칸 버튼)
    served: false,  // 이번 차례에 주문을 처리했는지 (되돌리기 막기용)
    log: [],        // AI가 이번 차례에 한 일 (오른쪽 패널에 표시)
    order: placeOrder(first),   // 말 놓는 순서
    placeIdx: 0,    // 지금 몇 번째 말을 놓는 중인지 (4가 되면 다 놓음)
    pick: 0,        // 이번 차례에 움직일 내 말 (0 또는 1)
    aiPick: 0,      // 이번 차례에 움직이는 AI 말
  };

  // AI가 선플레이어면 AI 말을 먼저 놓음
  placeAiTurns(g);
  return g;
}

// 지금 내가 말을 놓을 차례인지 (세팅 화면)
function myPlace() {
  return game.table && game.placeIdx < 4 && game.order[game.placeIdx] === 'me';
}

// 말을 다 놓았는지
function allPlaced() {
  return game.placeIdx >= 4;
}

let game = newGame();
