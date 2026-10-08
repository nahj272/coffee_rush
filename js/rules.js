/* =========================================================
   커피 러시 - 규칙 도우미
   "~할 수 있는지", "몇 개인지"처럼 계산만 하는 함수 모음
   (화면을 바꾸지 않음 · 나와 AI가 같이 씀)
   p = 누구의 정보인지 (game.me 또는 game.ai)
   p를 안 적으면 나(game.me)로 계산함
   ========================================================= */

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

// 지금 움직이는 내 말이 있는 칸 (이동 중이면 마지막으로 간 칸)
function head() {
  if (game.path.length) return game.path[game.path.length - 1];
  return game.me.pawns[game.pick];
}

// 그 칸에 아무 말이나 있는지 (말 놓을 때)
function taken(i) {
  return game.me.pawns.includes(i) || game.ai.pawns.includes(i);
}

// 그 칸에 다른 말이 있는지 (지나갈 순 있지만 멈출 순 없음)
// 상대 말 2개 + 움직이지 않는 내 다른 말
// k = 지금 움직이는 말 번호
function blocked(i, p = game.me, k = (p === game.me ? game.pick : game.aiPick)) {
  if (other(p).pawns.includes(i)) return true;
  return p.pawns.some((cell, n) => n !== k && cell === i);
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

// 이동을 끝낼 수 있는지
// 1칸 이상 갔고, 다른 말이 없는 칸이면 멈출 수 있음 (1~3칸, 러시 토큰을 쓰면 더)
// (다른 말이 있는 칸은 지나갈 수만 있고 멈출 수 없음)
function canStop() {
  return game.path.length >= 1 && game.path.length <= maxMove() && !blocked(head());
}

// 지나간 칸 하나에서 받는 재료 개수
// 보통은 1개. 켠 업그레이드의 조건이 맞을 때마다 ×2 (겹치면 곱해짐)
//  - 꼭짓점 ×2: 네 모서리 칸
//  - 스페셜 재료 ×2: 노란 띠 칸 (카라멜 · 물 · 찻잎 · 초콜릿)
//  - 게임 말 ×2: 상대 말이 있는 칸을 지나갈 때
// 예: 꼭짓점 + 게임 말을 켰고, 모서리 칸에 상대 말이 있으면 1 × 2 × 2 = 4개
function amount(i, p = game.me) {
  let n = 1;
  if (has('corner', p) && CORNERS.includes(i)) n *= 2;
  if (has('special', p) && ITEMS[BOARD[i]].special) n *= 2;
  if (has('pawn', p) && other(p).pawns.includes(i)) n *= 2;
  return n;
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

// 아직 안 쓴 러시 토큰 수
function rushLeft() {
  return game.me.rush - game.rushUse;
}

// 낼 수 있는 주문이 있는지 (있으면 차례를 끝내기 전에 내야 함)
function anyReady() {
  return game.me.queue.flat().some((order) => cupFor(order) >= 0);
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


/* ===== 점수 · 결과 ===== */

// 점수 = 좋아요(처리한 주문) ×1 + 업그레이드 ×2 − 싫어요 ×1
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
  if (game.me.penalty >= 5 || game.ai.penalty >= 5) {
    const who = game.me.penalty >= 5 ? '내' : 'AI';
    return `${who} 싫어요가 5장이 됐어요`;
  }
  return '주문 더미가 모두 떨어졌어요';
}
