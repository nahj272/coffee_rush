/* =========================================================
   커피 러시 - 차례 진행
   내 차례 순서
   0 말 놓기 (게임 처음 한 번) → 놓은 칸의 재료 1개를 컵에 담고 시작
   1 이동 (1~3칸, 러시 토큰을 쓰면 더 · 지나온 칸의 재료를 모두 받음)
   2 재료 담기 (다 담으면 자동으로 다음 단계)
   3 주문 처리 → "차례 끝내기" 버튼
   (AI 차례는 ai.js의 aiTurn)
   ========================================================= */


// 세팅 화면의 OPEN(게임 시작) 버튼 → 게임 화면으로 바꾸고 선플레이어부터 시작
function startGame() {
  if (!game.table || game.setup || !allPlaced()) return;
  game.table = false;
  if (mode === 'easy') game.me.rush += 2;   // 쉬움: 러시 토큰 2개로 시작
  if (game.turn === 'me') startTurn();
  else aiTurn();
}

// 시작 재료를 다 담았으면(또는 버렸으면) 게임 시작
// (세팅 화면에서 OPEN 버튼을 기다림)
function finishSetup() {
  game.setup = false;
  game.step = 0;
  game.placeIdx += 1;     // 다음 사람이 말을 놓을 차례
  placeAiTurns(game);     // AI 차례면 AI가 놓음
  draw();
}

// 내 차례 시작
function startTurn() {
  game.step = 1;
  game.pick = 0;
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

// 이동 끝 → 재료 받기 → 2 재료 담기로
function arrive() {
  // 3칸을 넘게 간 만큼만 러시 토큰 사용 (+1칸을 눌렀어도 덜 갔으면 안 씀)
  game.me.rush -= Math.max(0, game.path.length - 3);
  game.me.pawns[game.pick] = head();
  game.picks = collect(game.path);         // 지나온 칸의 재료를 모두 받음
  game.picked = 0;
  game.placed = [];
  game.step = 2;
  draw();
}

// 차례 끝: 4단 주문은 싫어요, 한 단씩 내려가고, 1단에 새 주문 1장
// (상대가 주문을 처리하면 그 수만큼 1단에 더 들어옴 → serve)
function endTurn(player) {
  const q = player.queue;

  const lost = q[3].length;   // 4단에 남은 주문 = 싫어요
  player.penalty += lost;
  player.rush += lost;        // 싫어요를 받으면 러시 토큰도 받음

  player.queue = [[], q[0], q[1], q[2]];   // 한 단씩 아래로
  if (game.deck.length) player.queue[0].push(game.deck.pop());   // 1단에 새 주문 1장

  // 싫어요 5장 이상 → 바로 게임 끝 (상대 차례 없이)
  if (player.penalty >= 5) game.over = true;
  // 주문 더미가 비면 → 이번 라운드까지만
  if (game.deck.length === 0) game.ending = true;
}

// 다음 사람 차례로
function nextTurn() {
  // 싫어요 5장으로 이미 끝났으면 다음 차례 없이 결과 창
  if (game.over) {
    draw();
    return;
  }

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

// 다시 하기: 새 게임으로
function restart() {
  game = newGame();
  draw();
}
