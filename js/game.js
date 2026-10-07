/* =========================================================
   커피 러시 - 게임 상태와 규칙
   (재료 · 음료 정보는 data.js, 화면 그리기는 draw.js)

   내 차례 순서
   0 말 놓기 (게임 처음 한 번) → 놓은 칸의 재료 1개를 컵에 담고 시작
   1 이동 (3칸째를 누르면 자동으로 다음 단계, 지나온 칸의 재료를 모두 받음)
   2 재료 담기 (다 담으면 자동으로 다음 단계)
   3 주문 처리 → "차례 끝내기" 버튼
   ========================================================= */


/* ===== 0. 닉네임 =====
   구글 로그인한 사람만 닉네임을 정해서 "(닉네임) 바리스타"로 보임.
   로그인 기능을 만들면 여기에 닉네임이 들어가도록 연결할 예정.
   null이면 (게스트) "내 주문"으로 보임 */
let nickname = null;


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
   - 말: AI는 아무 칸에, 나는 원하는 칸을 골라서 놓음
   - 말을 놓은 칸의 재료 1개를 컵에 담고 시작
   - 처리 · 벌점 · 러시 · 업그레이드는 모두 0 */
function newPlayer() {
  return {
    pawns: [],                 // 내 말이 있는 칸 번호
    queue: [[], [], [], []],   // 주문 1단 ~ 4단
    cups: [[], [], []],        // 컵 3개
    done: 0,                   // 처리한 주문 수
    doneList: [],              // 처리한 주문 카드 (화면 왼쪽에 보여줌)
    penalty: 0,                // 벌점
    rush: 0,                   // 러시 토큰
    ups: [],                   // 켠 업그레이드 key 목록 (예: ['diagonal'])
  };
}

function newGame() {
  const deck = makeDeck();
  const me = newPlayer();
  const ai = newPlayer();

  // AI 말은 아무 칸에 놓고, 그 칸의 재료 1개를 컵 1에 담고 시작
  const aiCell = rand(16);
  ai.pawns.push(aiCell);
  ai.cups[0].push(BOARD[aiCell]);

  // 먼저 할 사람(선플레이어): 반반 확률
  const first = rand(2) === 0 ? 'me' : 'ai';

  // 처음 주문: 모두 1단 1장 · 2단 1장, 선플레이어만 1단에 1장 더
  [me, ai].forEach((p) => {
    p.queue[0].push(deck.pop());   // 1단 1장
    p.queue[1].push(deck.pop());   // 2단 1장
  });
  (first === 'me' ? me : ai).queue[0].push(deck.pop());

  return {
    round: 1,
    first: first,   // 먼저 하는 사람
    turn: first,    // 지금 누구 차례인지: 'me' 또는 'ai'
    step: 0,        // 0 말 놓기 · 1 이동 · 2 재료 담기 · 3 주문 처리 · 4 차례 끝
    over: false,    // 게임이 끝났는지
    ending: false,  // 끝날 조건이 됨 → 이번 라운드까지만 하고 끝
    deck: deck,     // 남은 주문 더미
    me: me,
    ai: ai,
    path: [],       // 이번 차례에 지나온 칸 번호
    picks: [],      // 받았지만 아직 컵에 안 담은 재료
    picked: 0,      // 받은 재료 중 고른 것 (picks의 번호)
    setup: false,   // 시작 재료를 담는 중인지 (말 놓은 직후)
    table: true,    // 세팅 화면(테이블)을 보여주는 중인지 → "게임 시작"을 누르면 false
    placed: [],     // 이번 차례에 담은 컵 번호 (되돌리기용)
    upPick: null,   // 배너에서 고른 업그레이드 key
    upDone: false,  // 이번 차례에 업그레이드를 켰는지
    rushUse: 0,     // 이번 차례에 쓰려고 고른 러시 토큰 수 (+1칸 버튼)
    served: false,  // 이번 차례에 주문을 처리했는지 (되돌리기 막기용)
    log: [],        // AI가 이번 차례에 한 일 (오른쪽 패널에 표시)
  };
}

let game = newGame();


/* ===== 3. 규칙 도우미 =====
   p = 누구의 정보인지 (game.me 또는 game.ai)
   p를 안 적으면 나(game.me)로 계산함 */

// 상대 플레이어
function other(p) {
  return p === game.me ? game.ai : game.me;
}

// 칸 번호 → 상하좌우 이웃 칸 번호들
// (칸 번호: 왼쪽 위 0, 오른쪽으로 1 2 3, 다음 줄 4 ...)
function neighbors(i, p = game.me) {
  const row = Math.floor(i / 4);
  const col = i % 4;
  const list = [];
  if (row > 0) list.push(i - 4);   // 위
  if (row < 3) list.push(i + 4);   // 아래
  if (col > 0) list.push(i - 1);   // 왼쪽
  if (col < 3) list.push(i + 1);   // 오른쪽

  // 대각선 이동 업그레이드를 켰으면 대각선 4칸도
  if (has('diagonal', p)) {
    if (row > 0 && col > 0) list.push(i - 5);   // 왼쪽 위
    if (row > 0 && col < 3) list.push(i - 3);   // 오른쪽 위
    if (row < 3 && col > 0) list.push(i + 3);   // 왼쪽 아래
    if (row < 3 && col < 3) list.push(i + 5);   // 오른쪽 아래
  }
  return list;
}

// 그 업그레이드를 켰는지
function has(key, p = game.me) {
  return p.ups.includes(key);
}

// 지금 내 말이 있는 칸 (이동 중이면 마지막으로 간 칸)
function head() {
  if (game.path.length) return game.path[game.path.length - 1];
  return game.me.pawns[0];
}

// 그 칸에 상대 말이 있는지 (지나갈 순 있지만 멈출 순 없음)
function blocked(i, p = game.me) {
  return other(p).pawns.includes(i);
}

// 이번 차례에 움직일 칸 수 = 3 + 쓰기로 한 러시 토큰
function maxMove() {
  return 3 + game.rushUse;
}

// 재료 목록 두 개가 같은지 (순서 상관없이)
function same(a, b) {
  return a.slice().sort().join() === b.slice().sort().join();
}

// 컵 재료가 레시피의 "일부"인지 (아직 덜 찼지만 맞게 가는 중인지)
// 예: 컵 [커피] 는 레시피 [커피, 우유] 의 일부 → true
function partOf(cup, recipe) {
  const left = recipe.slice();
  for (const item of cup) {
    const k = left.indexOf(item);
    if (k < 0) return false;   // 레시피에 없는 재료가 들어 있음
    left.splice(k, 1);
  }
  return true;
}

// 이 주문을 낼 수 있는 컵 번호 (없으면 -1)
function cupFor(order, p = game.me) {
  return p.cups.findIndex((cup) => same(cup, order.items));
}

// 이동을 끝낼 수 있는지: 정해진 칸 수만큼 + 상대 말이 없는 칸
// (상대 말이 있는 칸은 지나갈 수만 있고 도착은 못 함)
function canStop() {
  return game.path.length === maxMove() && !blocked(head());
}

// 지나간 칸 하나에서 받는 재료 개수
// 보통은 1개. 업그레이드를 켰고 조건이 맞으면 2개
//  - 꼭짓점 ×2: 네 모서리 칸
//  - 스페셜 재료 ×2: 노란 띠 칸 (캐러멜 · 물 · 찻잎 · 초콜릿)
//  - 게임 말 ×2: 상대 말이 있는 칸을 지나갈 때
function amount(i, p = game.me) {
  if (has('corner', p) && CORNERS.includes(i)) return 2;
  if (has('special', p) && ITEMS[BOARD[i]].special) return 2;
  if (has('pawn', p) && blocked(i, p)) return 2;
  return 1;
}

// 이동한 길의 재료를 모두 모으기 (지나간 칸마다)
// 예: 길 [커피 칸, 우유 칸, 얼음 칸] → ['coffee', 'milk', 'ice']
function collect(path, p = game.me) {
  const list = [];
  path.forEach((i) => {
    for (let n = 0; n < amount(i, p); n++) list.push(BOARD[i]);
  });
  return list;
}

// 지금 업그레이드 배너를 보여줄지
// 내 차례 시작(아직 안 움직임) + 처리한 주문 3장 이상 + 이번 차례에 아직 안 켬
function canUpgrade() {
  return game.turn === 'me' && game.step === 1 && game.path.length === 0
    && !game.upDone && game.me.done >= 3 && game.me.ups.length < 4;
}


/* ===== 4. 클릭했을 때 하는 일 ===== */

// 재료판 칸을 눌렀을 때
function clickCell(i) {
  if (game.over) return;

  // 0 말 놓기: AI 말이 없는 칸이면 놓기 (누가 먼저 하든 내가 먼저 놓음)
  // 세팅 화면: 아직 컵에 안 담았으면 말을 다른 칸으로 옮길 수 있음
  if (game.table && game.setup) {
    if (blocked(i)) return;
    game.me.pawns = [i];
    game.picks = [BOARD[i]];
    draw();
    return;
  }

  if (game.step === 0) {
    if (blocked(i)) return;
    game.me.pawns = [i];

    // 놓은 칸의 재료 1개를 컵에 담고 시작
    game.picks = [BOARD[i]];
    game.picked = 0;
    game.placed = [];
    game.setup = true;
    game.step = 2;
    draw();
    return;
  }

  if (game.turn !== 'me') return;

  // 1 이동: 지금 칸의 바로 옆 칸만, 최대 칸 수까지
  if (game.step === 1) {
    if (!neighbors(head()).includes(i)) return;
    if (game.path.length >= maxMove()) return;
    game.path.push(i);

    // 정해진 칸 수를 다 움직였으면 바로 도착 (다음 버튼 필요 없음)
    // 정해진 칸 수를 다 움직였고 남은 러시 토큰이 없으면 바로 도착
    // (러시 토큰이 남아 있으면 "여기서 멈추기"나 "+1칸"을 고를 수 있게 기다림)
    if (canStop() && rushLeft() === 0) arrive();
    else draw();
  }
}

// 아직 안 쓴 러시 토큰 수
function rushLeft() {
  return game.me.rush - game.rushUse;
}

// 낼 수 있는 주문이 있는지 (있으면 차례를 끝내기 전에 내야 함)
function anyReady() {
  return game.me.queue.flat().some((order) => cupFor(order) >= 0);
}

// 이동 끝 → 재료 받기 → 2 재료 담기로
function arrive() {
  game.me.rush -= game.rushUse;            // 쓰기로 한 러시 토큰 사용
  game.me.pawns[0] = head();
  game.picks = collect(game.path);         // 지나온 칸의 재료를 모두 받음
  game.picked = 0;
  game.placed = [];
  game.step = 2;
  draw();
}

// 시작 재료를 다 담았으면(또는 버렸으면) 게임 시작
// (세팅 화면에서 "게임 시작" 버튼을 기다림)
function finishSetup() {
  game.setup = false;
  draw();
}

// 세팅 화면의 "게임 시작" 버튼 → 게임 화면으로 바꾸고 선플레이어부터 시작
function startGame() {
  if (!game.table || game.setup || game.me.pawns.length === 0) return;
  game.table = false;
  if (game.turn === 'me') startTurn();
  else aiTurn();
}

// 러시 토큰 "+1칸" 버튼
function rushMore() {
  if (game.step !== 1 || game.rushUse >= game.me.rush) return;
  game.rushUse += 1;
  draw();                    // 1칸 더 갈 수 있게 됨
}

// 러시 토큰 "취소" 버튼
function rushLess() {
  if (game.step !== 1 || game.rushUse === 0) return;
  game.rushUse -= 1;
  // 줄어든 칸 수보다 더 갔으면 넘친 만큼 되돌림
  while (game.path.length > maxMove()) game.path.pop();
  draw();
}

// 컵을 눌렀을 때 (2 재료 담기)
function clickCup(i) {
  if (game.step !== 2 || game.picks.length === 0) return;

  const item = game.picks.splice(game.picked, 1)[0];   // 고른 재료 1개 꺼내기
  game.me.cups[i].push(item);
  game.placed.push(i);
  game.picked = 0;

  // 다 담았으면 바로 다음으로 (시작 재료였으면 게임 시작)
  if (game.picks.length === 0) {
    if (game.setup) {
      finishSetup();
      return;
    }
    game.step = 3;
  }
  draw();
}

// 받은 재료 중 하나를 고를 때
function clickPick(k) {
  if (game.step !== 2) return;
  game.picked = k;
  draw();
}

// 컵 비우기: 컵에 든 재료를 모두 버림 (하나만 빼기는 안 됨)
function emptyCup(i) {
  if (game.turn !== 'me' || (game.step !== 2 && game.step !== 3)) return;
  game.me.cups[i] = [];
  game.placed = game.placed.filter((c) => c !== i);   // 되돌리기 목록에서도 빼기
  draw();
}

// 주문 카드를 눌렀을 때 (3 주문 처리)
function clickOrder(row, k) {
  if (game.step !== 3) return;

  if (serve(game.me, row, k)) {
    game.served = true;
    draw();
  }
}

// 주문 처리 (나와 AI가 같이 씀). 처리했으면 true
function serve(p, row, k) {
  const order = p.queue[row][k];
  const cup = cupFor(order, p);
  if (cup < 0) return false;   // 맞는 컵이 없음

  p.cups[cup] = [];            // 컵 비우기 (재료는 반납)
  p.queue[row].splice(k, 1);   // 주문 카드 빼기
  p.done += 1;
  p.doneList.push(order);           // 처리한 주문 카드 모아두기
  if (order.special) p.rush += 1;   // 스페셜 메뉴 → 러시 토큰

  // 주문을 처리하면 상대 1단에 주문 1장 추가
  if (game.deck.length) other(p).queue[0].push(game.deck.pop());
  return true;
}

// 오른쪽 아래 "다음" 버튼
function clickNext() {
  if (game.over) return;
  if (game.turn !== 'me' && !game.setup) return;

  if (game.step === 1) {
    // "여기서 멈추기": 러시 토큰을 더 안 쓰고 도착
    if (canStop()) arrive();
  } else if (game.step === 2) {
    // "남은 재료 버리기": 안 담은 재료는 버리고 3 주문 처리로
    game.picks = [];
    if (game.setup) {
      finishSetup();
      return;
    }
    game.step = 3;
    draw();
  } else if (game.step === 3) {
    // "차례 끝내기": 낼 수 있는 음료가 있으면 먼저 내야 함
    if (anyReady()) return;
    endTurn(game.me);
    nextTurn();
  }
}

// 업그레이드 배너: 고르기
function pickUpgrade(key) {
  if (!canUpgrade() || has(key)) return;
  game.upPick = key;
  draw();
}

// 업그레이드 배너: "켜기" 버튼 → 처리한 주문 3장 버리고 켬
function useUpgrade() {
  if (!canUpgrade() || !game.upPick) return;
  game.me.done -= 3;
  game.me.doneList.splice(0, 3);       // 처리한 주문 카드 3장 버리기
  game.me.ups.push(game.upPick);
  game.upPick = null;
  game.upDone = true;
  draw();
}

// 왼쪽 아래 "되돌리기" 버튼
function clickBack() {
  if (game.step === 1) {
    game.path.pop();                          // 마지막 한 칸 취소
  } else if ((game.step === 2 || game.step === 3) && game.placed.length && !game.served) {
    // 마지막에 담은 재료를 다시 빼서 2 재료 담기로 (주문을 낸 뒤에는 안 됨)
    const cup = game.placed.pop();
    game.picks.unshift(game.me.cups[cup].pop());
    game.picked = 0;
    game.step = 2;
  }
  draw();
}


/* ===== 5. 차례 넘기기 ===== */

// 내 차례 시작
function startTurn() {
  game.step = 1;
  game.path = [];
  game.picks = [];
  game.placed = [];
  game.upPick = null;
  game.upDone = false;
  game.rushUse = 0;
  game.served = false;
  game.picked = 0;
  draw();
}

// 차례 끝: 4단 주문은 벌점, 한 단씩 내려가고, 1단에 새 주문
function endTurn(player) {
  const q = player.queue;

  const lost = q[3].length;   // 4단에 남은 주문 = 벌점
  player.penalty += lost;
  player.rush += lost;        // 벌점을 받으면 러시 토큰도 받음

  player.queue = [[], q[0], q[1], q[2]];   // 한 단씩 아래로
  if (game.deck.length) player.queue[0].push(game.deck.pop());

  // 벌점 5장 이상 또는 주문 더미가 비면 → 이번 라운드까지만
  if (player.penalty >= 5 || game.deck.length === 0) game.ending = true;
}

// 다음 사람 차례로
function nextTurn() {
  game.turn = game.turn === 'me' ? 'ai' : 'me';

  // 먼저 한 사람에게 돌아오면 한 라운드가 끝난 것
  if (game.turn === game.first) {
    if (game.ending) {
      game.over = true;
      draw();
      return;
    }
    game.round += 1;
  }

  if (game.turn === 'me') startTurn();
  else aiTurn();
}

// AI 차례는 ai.js에 있음 (aiTurn)


/* ===== 5-2. 점수 · 결과 ===== */

// 점수 = 처리한 주문 ×1 + 업그레이드 ×2 − 벌점 ×1
function score(p) {
  return p.done + p.ups.length * 2 - p.penalty;
}

// 누가 이겼는지: 'me' · 'ai' · 'tie'(공동 승리)
// 점수가 같으면 → 처리한 주문 수 → 러시 토큰 수 순서로 비교
function winner() {
  const me = game.me;
  const ai = game.ai;
  const checks = [
    score(me) - score(ai),
    me.done - ai.done,
    me.rush - ai.rush,
  ];
  for (const diff of checks) {
    if (diff > 0) return 'me';
    if (diff < 0) return 'ai';
  }
  return 'tie';
}

// 게임이 끝난 이유
function endReason() {
  if (game.deck.length === 0) return '주문 더미가 모두 떨어졌어요';
  const who = game.me.penalty >= 5 ? '내' : 'AI';
  return `${who} 벌점이 5장이 됐어요`;
}

// 다시 하기: 새 게임으로
function restart() {
  game = newGame();
  draw();
}


/* ===== 6. 버튼 연결 ===== */

// 칸 · 컵 · 카드는 그릴 때마다 새로 생기므로, 감싸는 상자에 한 번만 연결
$('board').addEventListener('click', (e) => {
  const cell = e.target.closest('.cell');
  if (cell) clickCell(Number(cell.dataset.i));
});

// 세팅 화면: 재료판 · 내 컵 · 게임 시작 버튼
$('tBoard').addEventListener('click', (e) => {
  const cell = e.target.closest('.cell');
  if (cell) clickCell(Number(cell.dataset.i));
});

$('seatMe').addEventListener('click', (e) => {
  const cup = e.target.closest('.cup');
  if (cup) clickCup(Number(cup.dataset.i));
});

$('startBtn').addEventListener('click', startGame);

// 개인 판의 업그레이드 타일 고르기 (켜기는 오른쪽 패널의 버튼)
$('myTiles').addEventListener('click', (e) => {
  const tile = e.target.closest('.tile');
  if (tile) pickUpgrade(tile.dataset.key);
});

$('cups').addEventListener('click', (e) => {
  const empty = e.target.closest('.cup-empty');
  if (empty) {
    emptyCup(Number(empty.dataset.i));
    return;
  }
  const cup = e.target.closest('.cup');
  if (cup) clickCup(Number(cup.dataset.i));
});

$('picks').addEventListener('click', (e) => {
  const pick = e.target.closest('.pick');
  if (pick) clickPick(Number(pick.dataset.k));
});

$('queue').addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (card) clickOrder(Number(card.dataset.row), Number(card.dataset.k));
});

$('up').addEventListener('click', (e) => {
  if (e.target.closest('.up-btn')) useUpgrade();
});

$('againBtn').addEventListener('click', restart);
$('homeBtn').addEventListener('click', () => {
  location.href = '../index.html';
});

$('rushBox').addEventListener('click', (e) => {
  if (e.target.closest('.rush-more')) rushMore();
  if (e.target.closest('.rush-less')) rushLess();
});

$('nextBtn').addEventListener('click', clickNext);
$('subBtn').addEventListener('click', clickBack);


/* ===== 7. 시작 ===== */
draw();
