/* =========================================================
   커피 러시 - 튜토리얼 (2분 맛보기)
   정해진 판에서 한 차례를 직접 해 봄: 이동 → 담기 → 주문 내기 → 주문이 내려감(보여 주기)
   - 시작: 메인 [튜토리얼] · 메인 게임 방법 5쪽의 [튜토리얼] · ? 게임 방법 창의 [튜토리얼]
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

let tut = 0;         // 지금 몇 단계인지 (0이면 튜토리얼 아님)
let tutWait = 0;     // 2칸을 다 간 뒤 잠깐 기다렸다가 도착 (지나온 길을 보여 주려고)
let tutPhase = '';   // 4단계 진행: 'read' 말풍선 읽기 → 'move' 주문이 내려가는 중 → 'done' 싫어요까지 보여 줌
let tutTimers = [];  // 4단계 시간 예약 (건너뛰면 모두 취소)

// 4단계 시간 (밀리초 · 1000 = 1초)
const TUT_READ = 1500;   // 말풍선 제목을 읽을 시간
const TUT_MOVE = 1000;   // 주문이 한 칸 내려가는 시간 (천천히 눈으로 따라갈 수 있게)


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
  // 4단의 카페 라테는 이번 차례에 못 만듦 → 차례가 끝나면 싫어요가 되는 모습을 보여 줌
  game.me.queue = [[find('아메리카노')], [find(TUT.drink)], [], [find('카페 라테')]];
  game.ai.queue = [[find('카페 라테')], [find('밀크티')], [], []];

  clearTut();
  tut = 1;
  startTurn();   // 1 이동부터 (draw까지 함)
}

// 건너뛰기 · OPEN: 새 게임의 게임 준비 화면으로
function endTutorial() {
  clearTut();
  tut = 0;
  restart();
}

// 예약해 둔 시간 · 움직임 모두 취소
function clearTut() {
  clearTimeout(tutWait);
  tutWait = 0;
  tutTimers.forEach(clearTimeout);
  tutTimers = [];
  tutPhase = '';
  $('queue').classList.remove('tut-move');
}

// 시간 예약 (건너뛰면 취소되게 모아 둠)
function tutLater(fn, ms) {
  tutTimers.push(setTimeout(fn, ms));
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
    tutPhase = 'read';                  // 내린 결과는 아직 안 보여 줌 → 말풍선을 먼저 읽게
    tutLater(tutShift, TUT_READ);
  }

  const s = TUT_STEPS[tut];
  layer.hidden = false;

  // 5 마무리: 가운데 카드
  if (tut === 5) {
    layer.innerHTML = `
      <div class="tut-dim"></div>
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

  // 밝게 보여 줄 곳 (4단계 끝에는 싫어요 더미 · 맨 위 싫어요 숫자도 같이)
  let targets = [document.querySelector(s.target)];
  if (tut === 4 && tutPhase === 'done') targets.push(...shown(['.trash', '.stats .stat.red']));
  const holes = targets.map((el) => {
    const r = el.getBoundingClientRect();
    return { x1: r.left - 6, y1: r.top - 6, x2: r.right + 6, y2: r.bottom + 6 };
  });

  // 어두운 덮개 한 장에 구멍(밝은 곳)을 뚫음 (구멍 안은 눌림)
  const cut = holes.map((h) => `${h.x1}px ${h.y1}px, ${h.x1}px ${h.y2}px, ${h.x2}px ${h.y2}px, ${h.x2}px ${h.y1}px, ${h.x1}px ${h.y1}px, 0 0`).join(', ');
  const rings = holes.map((h, k) =>
    `<div class="tut-ring ${tut === 4 && tutPhase === 'done' && k > 0 ? 'pop' : ''}" style="left:${h.x1}px; top:${h.y1}px; width:${h.x2 - h.x1}px; height:${h.y2 - h.y1}px"></div>`).join('');
  const dots = [1, 2, 3, 4, 5].map((k) => `<i class="${k === tut ? 'on' : ''}"></i>`).join('');
  const next = tut === 4 && tutPhase === 'done' ? '<button class="tut-next" type="button" id="tutNext">다음</button>' : '';

  layer.innerHTML = `
    <div class="tut-dim" style="clip-path: polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${cut})"></div>
    ${rings}
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

  // 말풍선 자리: 4단계는 내려가는 주문(1단 → 2단) 옆에 붙임 (옆에 자리가 있는 PC 화면일 때)
  const r = targets[0].getBoundingClientRect();
  const room = $('tutBox').offsetWidth + 32;
  if (tut === 4 && (innerWidth - r.right > room || r.left > room)) {
    const row = $('queue').children[tutPhase === 'done' ? 1 : 0].getBoundingClientRect();
    placeTut({ left: r.left, right: r.right, top: row.top, bottom: r.bottom });
  } else {
    placeTut(r);
  }
}

// 보이는 것만 골라 줌 (휴대폰에서는 싫어요 더미가 '내 컵' 탭에 숨어 있어서 맨 위 숫자로 보여 줌)
function shown(selectors) {
  return selectors.map((sel) => document.querySelector(sel))
    .filter((el) => el && el.getClientRects().length && el.getBoundingClientRect().width > 0);
}

// 4단계: 차례 끝 → 주문이 한 칸씩 내려가는 모습 (말풍선도 같이 내려감) → 4단 주문이 싫어요로
function tutShift() {
  // 내리기 전 카드 자리 기억
  const before = [...document.querySelectorAll('#queue .card')].map((el) => ({
    order: game.me.queue[el.dataset.row][el.dataset.k],
    rect: el.getBoundingClientRect(),
    html: el.outerHTML,
    row: Number(el.dataset.row),
  }));
  const rows = $('queue').children;
  const pitch = rows[1].getBoundingClientRect().top - rows[0].getBoundingClientRect().top;
  const oldPenalty = game.me.penalty;

  tutPhase = 'move';
  endTurn(game.me);
  startTurn();                                  // 내린 결과를 그림 (아래에서 원래 자리로 되돌려 놓고 움직임)
  $('penalty').textContent = oldPenalty;        // 싫어요 숫자는 움직임이 끝난 뒤에 바뀌게
  $('trashCount').textContent = oldPenalty;

  // 카드를 내리기 전 자리로 옮겨 두기 (새 주문은 위에서 흐리게 시작)
  $('queue').classList.add('tut-move');
  const used = new Set();
  const cards = [...document.querySelectorAll('#queue .card')];
  cards.forEach((el) => {
    const order = game.me.queue[el.dataset.row][el.dataset.k];
    const old = before.find((b, i) => b.order === order && b.row < 3 && !used.has(i) && used.add(i));
    const now = el.getBoundingClientRect();
    el.style.transform = old ? `translateY(${old.rect.top - now.top}px)` : 'translateY(-36px)';
    if (!old) el.style.opacity = 0;
  });

  // 4단에서 빠지는 주문: 덮개 쪽에 똑같은 카드를 그려서 아래로 사라지게
  const lost = before.filter((b) => b.row === 3).map((b) => {
    const ghost = document.createElement('div');
    ghost.className = 'tut-ghost';
    ghost.style.cssText = `left:${b.rect.left}px; top:${b.rect.top}px; width:${b.rect.width}px`;
    ghost.innerHTML = b.html;
    $('tutLayer').append(ghost);
    return ghost;
  });

  // 말풍선도 1단 옆에서 2단 옆으로 같이 내려감 (옆에 붙은 PC 화면일 때)
  const box = $('tutBox');
  const side = box.classList.contains('r') || box.classList.contains('l');

  requestAnimationFrame(() => requestAnimationFrame(() => {
    const move = `transform ${TUT_MOVE}ms ease-in-out, opacity ${TUT_MOVE}ms ease-in-out, top ${TUT_MOVE}ms ease-in-out`;
    cards.forEach((el) => { el.style.transition = move; el.style.transform = ''; el.style.opacity = ''; });
    lost.forEach((g) => { g.style.transition = move; g.style.transform = `translateY(${pitch * 0.6}px)`; g.style.opacity = 0; });
    if (side) { box.style.transition = move; box.style.top = (parseFloat(box.style.top) + pitch) + 'px'; }
  }));

  // 다 내려가면: 싫어요 숫자를 바꾸고 싫어요 더미를 밝게 · [다음]
  tutLater(() => {
    tutPhase = 'done';
    $('queue').classList.remove('tut-move');
    draw();
  }, TUT_MOVE + 150);
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

// 화면 크기가 바뀌면 밝게 보여 줄 곳 · 말풍선 자리를 다시 계산 (주문이 내려가는 중에는 기다림)
window.addEventListener('resize', () => {
  if (tut && tutPhase !== 'move') drawTut();
});
