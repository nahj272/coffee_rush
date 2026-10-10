/* =========================================================
   커피 러시 - 튜토리얼 (2분 맛보기)
   정해진 판에서 한 차례를 직접 해 봄: 이동 → 담기 → 주문 내기 → 주문이 내려감
   - 시작: ? 게임 방법 창의 [튜토리얼] 버튼 · 메인 게임 방법 5쪽의 [튜토리얼]
   - 안내할 곳만 밝게, 나머지는 어둡게 덮어서 못 누르게 함
   - 게임 규칙 코드는 그대로 씀 (click.js에서 tutBlock으로 엉뚱한 클릭만 막음)
   ========================================================= */


// 정해진 판: 내 말(7번 물 칸) → 11번 원두 → 15번 스팀 = 에스프레소
const TUT = {
  start: 7,          // 움직일 내 말
  other: 12,         // 다른 내 말
  ai: [5, 13],       // AI 말
  path: [11, 15],    // 눌러야 할 칸 (차례대로)
  drink: '에스프레소',
};

// 단계별 안내 (target: 밝게 보여 줄 곳)
const TUT_STEPS = [
  null,
  { title: '말을 움직여요', text: '원하는 방향(상하좌우)으로 말을 움직여요.', target: '#board' },
  { title: '컵에 담아요', text: '받은 재료를 컵 1에 담아 보세요.', target: '#cups' },
  { title: '주문을 내요', text: '초록으로 빛나는 카드를 눌러 주문을 내요.', target: '#queue' },
  { title: '주문은 한 칸씩 내려가요', text: '4단을 넘긴 주문은 싫어요가 돼요. 싫어요 5개면 게임 끝!', target: '#queue' },
  { title: '오픈 준비 완료!', text: '손님을 받아볼까요?' },
];

let tut = 0;       // 지금 몇 단계인지 (0이면 튜토리얼 아님)
let tutWait = 0;   // 2칸을 다 간 뒤 잠깐 기다렸다가 도착 (지나온 길을 보여 주려고)


/* ===== 시작 · 끝 ===== */
function startTutorial() {
  const find = (name) => MENUS.find((m) => m.name === name);

  game = newGame();
  game.me = newPlayer();
  game.ai = newPlayer();
  game.table = false;
  game.first = 'me';
  game.turn = 'me';
  game.placeIdx = 4;
  game.me.pawns = [TUT.start, TUT.other];
  game.ai.pawns = [...TUT.ai];
  game.me.queue = [[find('카페 라테')], [find(TUT.drink)], [], []];
  game.ai.queue = [[find('아메리카노')], [find('밀크티')], [], []];

  tut = 1;
  startTurn();   // 1 이동부터 (draw까지 함)
}

// 건너뛰기 · OPEN: 새 게임의 게임 준비 화면으로
function endTutorial() {
  tut = 0;
  clearTimeout(tutWait);
  tutWait = 0;
  restart();
}


/* ===== 엉뚱한 클릭 막기 (click.js에서 부름) =====
   막아야 하면 true */
function tutBlock(kind, a, b) {
  if (!tut) return false;
  if (tut === 1) return !(kind === 'cell' && a === TUT.path[game.path.length]);
  if (tut === 2) return !(kind === 'cup' && a === 0);
  if (tut === 3) {
    const order = kind === 'order' && game.me.queue[a][b];
    return !order || order.name !== TUT.drink;
  }
  return true;
}


/* ===== 그리기 (draw.js의 draw 끝에서 부름) ===== */
function drawTut() {
  const layer = $('tutLayer');
  if (!tut) {
    layer.hidden = true;
    return;
  }

  // 게임 상태를 보고 다음 단계로
  if (tut === 1 && game.step === 1 && game.path.length === TUT.path.length && !tutWait) {
    tutWait = setTimeout(() => { tutWait = 0; arrive(); }, 400);
  }
  if (tut === 1 && game.step === 2) tut = 2;
  if (tut === 2 && game.step === 3) tut = 3;
  if (tut === 3 && game.served) {
    tut = 4;
    endTurn(game.me);   // 주문이 한 단씩 내려가는 모습
    startTurn();        // 다시 그림 (이 함수도 다시 불림)
    return;
  }

  const s = TUT_STEPS[tut];
  layer.hidden = false;

  // 5 마무리: 가운데 카드
  if (tut === 5) {
    layer.innerHTML = `
      <div class="tut-dim" style="inset: 0"></div>
      <div class="tut end">
        <span class="tut-no">5 / 5</span>
        <b>${s.title}</b>
        <p>${s.text}</p>
        <div class="tut-btns">
          <button class="btn" type="button" id="tutAgain">다시 보기</button>
          <button class="btn main open" type="button" id="tutOpen">OPEN</button>
        </div>
      </div>`;
    return;
  }

  // 밝게 보여 줄 곳 둘레에 어두운 판 4장 + 노란 테두리
  const r = document.querySelector(s.target).getBoundingClientRect();
  const pad = 6;
  const x1 = r.left - pad, y1 = r.top - pad, x2 = r.right + pad, y2 = r.bottom + pad;
  const dim = (l, t, w, h) => `<div class="tut-dim" style="left:${l}px; top:${t}px; width:${w}px; height:${h}px"></div>`;
  const dots = [1, 2, 3, 4, 5].map((k) => `<i class="${k === tut ? 'on' : ''}"></i>`).join('');
  const next = tut === 4 ? '<button class="tut-next" type="button" id="tutNext">다음</button>' : '';

  layer.innerHTML = `
    ${dim(0, 0, innerWidth, y1)}
    ${dim(0, y2, innerWidth, innerHeight - y2)}
    ${dim(0, y1, x1, y2 - y1)}
    ${dim(x2, y1, innerWidth - x2, y2 - y1)}
    <div class="tut-ring" style="left:${x1}px; top:${y1}px; width:${x2 - x1}px; height:${y2 - y1}px"></div>
    <div class="tut" id="tutBox">
      <span class="tut-no">${tut} / 5</span>
      <b>${s.title}</b>
      <p>${s.text}</p>
      <div class="tut-foot">
        <span class="tut-dots">${dots}</span>
        <button class="tut-skip" type="button" id="tutSkip">건너뛰기</button>
        ${next}
      </div>
    </div>`;

  // 1단계: 눌러야 할 칸 위에 노란 테두리 + 1 · 2 번호 (칸 밖으로 잘리지 않게 덮개 쪽에 그림)
  if (tut === 1) {
    TUT.path.forEach((i, k) => {
      if (game.path.includes(i)) return;   // 이미 지나간 칸은 표시 없음
      const c = document.querySelector(`#board .cell[data-i="${i}"]`).getBoundingClientRect();
      layer.insertAdjacentHTML('beforeend',
        `<span class="tut-here" style="left:${c.left - 5}px; top:${c.top - 5}px; width:${c.width + 10}px; height:${c.height + 10}px"><i>${k + 1}</i></span>`);
    });
  }

  placeTut(r);
}

// 말풍선 자리: 오른쪽 → 왼쪽 → 아래 → 위 → 화면 아래 순서로 들어갈 곳
function placeTut(r) {
  const box = $('tutBox');
  const w = box.offsetWidth;
  const h = box.offsetHeight;
  const gap = 16;
  const fitY = (y) => Math.max(12, Math.min(y, innerHeight - h - 12));
  const fitX = (x) => Math.max(12, Math.min(x, innerWidth - w - 12));
  let x, y, side = '';

  if (innerWidth - r.right > w + gap * 2) { x = r.right + gap; y = fitY(r.top); side = 'r'; }
  else if (r.left > w + gap * 2) { x = r.left - w - gap; y = fitY(r.top); side = 'l'; }
  else if (innerHeight - r.bottom > h + gap * 2) { x = fitX(r.left); y = r.bottom + gap; }
  else if (r.top > h + gap * 2) { x = fitX(r.left); y = r.top - h - gap; }
  else { x = fitX((innerWidth - w) / 2); y = innerHeight - h - 12; }

  box.className = 'tut ' + side;   // r · l: 대상 쪽으로 꼬리
  box.style.left = x + 'px';
  box.style.top = y + 'px';
}


/* ===== 버튼 ===== */
$('tutLayer').addEventListener('click', (e) => {
  if (e.target.closest('#tutSkip') || e.target.closest('#tutOpen')) endTutorial();
  if (e.target.closest('#tutAgain')) startTutorial();
  if (e.target.closest('#tutNext')) {
    tut = 5;
    drawTut();
  }
});

$('tutBtn').addEventListener('click', () => {
  closeHelp();
  startTutorial();
});

// 화면 크기가 바뀌면 밝게 보여 줄 곳 · 말풍선 자리를 다시 계산
window.addEventListener('resize', () => {
  if (tut) drawTut();
});
