/* =========================================================
   커피 러시 - 클릭 · 버튼
   화면을 눌렀을 때 하는 일과 버튼 연결
   (맨 마지막에 불러오는 파일 → 끝에서 첫 화면을 그림)
   ========================================================= */


// 재료판 칸을 눌렀을 때
function clickCell(i) {
  if (game.over) return;

  // 세팅 화면: 내가 말을 놓을 차례
  if (game.table) {
    if (!myPlace()) return;

    // 아직 컵에 안 담았으면 방금 놓은 말을 다른 칸으로 옮길 수 있음
    if (game.setup) {
      game.me.pawns.pop();
      if (taken(i)) {
        game.me.pawns.push(game.picksCell);   // 다른 말이 있는 칸이면 그대로
        return;
      }
    } else if (taken(i)) {
      return;
    }

    // 말을 놓고, 그 칸의 재료 1개를 컵에 담기
    game.me.pawns.push(i);
    game.picksCell = i;
    game.picks = [BOARD[i]];
    game.picked = 0;
    game.placed = [];
    game.setup = true;
    game.step = 2;
    draw();
    return;
  }

  if (game.turn !== 'me') return;

  // 1 이동 전: 내 다른 말을 누르면 그 말로 바꿈 (말 2개 중 하나만 움직임)
  if (game.step === 1 && game.path.length === 0) {
    const k = game.me.pawns.indexOf(i);
    if (k >= 0 && k !== game.pick) {
      game.pick = k;
      draw();
      return;
    }
  }

  // 1 이동: 지금 칸의 바로 옆 칸만, 최대 칸 수까지
  if (game.step === 1) {
    if (!neighbors(head()).includes(i)) return;
    if (game.path.length >= maxMove()) return;
    game.path.push(i);

    // 정해진 칸 수를 다 움직였고 남은 러시 토큰이 없으면 바로 도착
    // (러시 토큰이 남아 있으면 "여기서 멈추기"나 "+1칸"을 고를 수 있게 기다림)
    if (game.path.length === maxMove() && canStop() && rushLeft() === 0) arrive();
    else draw();
  }
}

// 세팅 화면: 난이도 고르기 (게임 시작 전에만)
function pickMode(key) {
  if (!game.table) return;
  mode = key;
  draw();
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
// 완성된 컵에도 재료를 더 담을 수 있음 (예: 아이스 초코라테 + 원두 → 아이스 카페 모카)
// 낼지 더 담을지는 플레이어가 고름
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

// 주문 카드를 눌렀을 때 (3 주문 처리 · 재료를 담는 중에도 낼 수 있음)
function clickOrder(row, k) {
  if (game.turn !== 'me' || game.table) return;
  if (game.step !== 2 && game.step !== 3) return;

  if (serve(game.me, row, k)) {
    game.served = true;
    draw();
  }
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


/* ===== 게임 방법 창: ? 버튼으로 열고, ✕ · 바깥 · ESC로 닫기 ===== */
function openHelp() {
  $('help').hidden = false;
}
function closeHelp() {
  $('help').hidden = true;
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

$('modeBox').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-mode]');
  if (btn) pickMode(btn.dataset.mode);
});

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

$('helpBtn').addEventListener('click', openHelp);
$('helpClose').addEventListener('click', closeHelp);
$('help').addEventListener('click', (e) => {
  if (e.target === $('help')) closeHelp();   // 어두운 바깥을 누르면 닫힘
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeHelp();
});


/* ===== 시작: 첫 화면 그리기 ===== */
draw();

// 주소 끝에 ?help 가 붙어 오면 (로그인 창의 '게스트로 체험하기') 게임 방법 창을 바로 열기
if (location.search.includes('help')) openHelp();
