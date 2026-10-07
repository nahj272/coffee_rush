/* =========================================================
   커피 러시 - 화면 그리기
   game 상태를 보고 화면을 다시 그림 (규칙은 game.js)
   ========================================================= */


// 짧게 쓰려고 만든 도우미: id로 요소 찾기
const $ = (id) => document.getElementById(id);

// 재료 아이콘 <img> 한 개
function icon(key) {
  const item = ITEMS[key];
  const cls = item.big ? 'big' : '';
  return `<img class="${cls}" src="${ICON + item.img}" alt="${item.name}">`;
}


// 조사 붙이기: 받침이 있으면 앞 글자, 없으면 뒤 글자
// 예: josa('스팀', '을/를') → '스팀을' · josa('우유', '을/를') → '우유를'
// onlyJosa가 true면 조사만 돌려줌 ('을')
function josa(word, pair, onlyJosa) {
  const [withEnd, noEnd] = pair.split('/');
  const last = word[word.length - 1];
  const code = last.charCodeAt(0) - 0xAC00;
  let end = false;
  if (code >= 0 && code <= 11171) end = code % 28 > 0;   // 한글: 받침 확인
  if ('013678'.includes(last)) end = true;               // 숫자: 영 일 삼 육 칠 팔
  const j = end ? withEnd : noEnd;
  return onlyJosa ? j : word + j;
}


/* ===== 맨 위 줄 ===== */
function drawTop() {
  const me = game.me;

  $('round').textContent = game.round;
  $('turn').textContent = game.turn === 'me' ? '내 차례' : 'AI 차례';
  $('turn').className = 'turn ' + game.turn;
  if (game.over) {
    $('turn').textContent = '게임 끝';
    $('turn').className = 'turn';
  }
  if (game.table) {
    $('turn').textContent = '게임 준비';
    $('turn').className = 'turn';
  }
  $('modeTag').textContent = mode === 'easy' ? '쉬움 모드' : '보통 모드';
  $('modeTag').className = 'mode-tag ' + mode;
  $('done').textContent = me.done;
  $('penalty').textContent = me.penalty;
  $('rush').textContent = me.rush;
  $('trashCount').textContent = me.penalty;

  // 업그레이드 4칸: 켠 것은 초록 점 (마우스를 올리면 이름)
  let dots = '';
  UPGRADES.forEach((up) => {
    const on = me.ups.includes(up.key) ? 'on' : '';
    dots += `<i class="${on}" title="${up.name}"></i>`;
  });
  $('upgrade').innerHTML = dots;

}


/* ===== 개인 판 조각 (세팅 화면 · 게임 화면에서 같이 씀) ===== */

// 업그레이드 타일 그림 (원작 타일 모양을 단순하게)
const TILE_ICON = {
  pawn:     '<svg viewBox="0 0 32 32"><circle cx="9" cy="9" r="5"/><rect x="4" y="15" width="10" height="12" rx="3"/><text x="23" y="24" font-size="11" font-weight="800" text-anchor="middle">×2</text></svg>',
  diagonal: '<svg viewBox="0 0 32 32"><path d="M6 6L26 26M26 6L6 26" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="16" r="3"/></svg>',
  corner:   '<svg viewBox="0 0 32 32"><rect x="4" y="4" width="24" height="24" fill="none" stroke-width="2"/><rect x="4" y="4" width="7" height="7"/><rect x="21" y="4" width="7" height="7"/><rect x="4" y="21" width="7" height="7"/><rect x="21" y="21" width="7" height="7"/><text x="16" y="20" font-size="9" font-weight="800" text-anchor="middle">×2</text></svg>',
  special:  '<svg viewBox="0 0 32 32"><rect x="4" y="4" width="24" height="24" fill="none" stroke-width="2"/><path d="M4 12L12 4H17L4 17Z" fill="#F2C230" stroke="none"/><text x="18" y="23" font-size="10" font-weight="800" text-anchor="middle">×2</text></svg>',
};

// 업그레이드 타일 4개
// on: 켠 타일 · can: 지금 누를 수 있음 · pick: 고른 타일
function tilesHTML(p, clickable) {
  return UPGRADES.map((up) => {
    let cls = 'tile';
    if (has(up.key, p)) cls += ' on';
    else if (clickable) cls += ' can';
    if (clickable && game.upPick === up.key) cls += ' pick';
    return `<button class="${cls}" type="button" data-key="${up.key}" title="${up.desc}">
              ${TILE_ICON[up.key]}<span>${up.name}</span>
            </button>`;
  }).join('');
}

// 주문 1~4단 (왼쪽 번호 띠 + 주문 카드)
function rowsHTML(p, isMe) {
  let html = '';
  p.queue.forEach((row, r) => {
    const last = r === 3;   // 4단은 이번 차례 끝에 벌점이 됨
    html += `<div class="row ${last ? 'danger' : ''}"><span class="rnum">${r + 1}</span><div class="row-cards ${row.length >= 2 ? 'many' : ''}">`;

    // 카드가 2장 이상이면 한 줄짜리 작은 카드로 (이름 옆에 재료)
    row.forEach((order, k) => {
      let cls = 'card';
      if (order.special) cls += ' special';
      if (isMe && (game.step === 2 || game.step === 3) && game.turn === 'me'
          && !game.table && cupFor(order) >= 0) cls += ' ready';   // 낼 수 있는 주문

      html += `<div class="${cls}" data-row="${r}" data-k="${k}">`;
      html += `<b>${order.name}</b>`;
      // 스페셜 표시는 재료 아이콘 줄 오른쪽에 (메뉴 이름과 안 겹치게)
      const tag = order.special ? '<em>스페셜</em>' : '';
      html += `<div class="mini">${order.items.map(icon).join('')}${tag}</div>`;
      html += `</div>`;
    });

    if (last && row.length) html += `<small class="warn-txt">차례 끝에 벌점</small>`;
    html += `</div></div>`;
  });
  return html;
}


/* ===== 왼쪽: 내 주문 1단 ~ 4단 ===== */
function drawQueue() {
  // 제목: 닉네임이 있으면 "(닉네임) 바리스타", 없으면 "내 주문"
  $('myName').textContent = nickname ? `${nickname} 바리스타` : '내 주문';

  // 처리한 주문 카드 (왼쪽 아래 초록 상자)
  const list = game.me.doneList;
  $('doneCount').textContent = list.length;
  $('doneList').innerHTML = list.length
    ? list.map((o) => `<span class="${o.special ? 'special' : ''}">${o.name}</span>`).join('')
    : '<small>아직 없어요</small>';

  // 업그레이드 타일 (처리한 주문 3장 이상 + 차례 시작이면 누를 수 있음)
  $('myTiles').innerHTML = tilesHTML(game.me, canUpgrade());

  // 주문 1~4단
  const html = rowsHTML(game.me, true);
  $('queue').innerHTML = html;
}


/* ===== 오른쪽: AI 개인 판 (내 판과 같은 모양 · 보기만 함) ===== */
function drawAiSide() {
  const ai = game.ai;
  $('aiInfo').textContent = `러시 ${ai.rush} · 처리 ${ai.done} · 벌점 ${ai.penalty}`;

  // 업그레이드 타일: 켠 것은 초록 (누를 수는 없음)
  $('aiTiles').innerHTML = tilesHTML(ai, false);
  $('aiRows').innerHTML = rowsHTML(ai, false);

  // AI 컵 3개
  $('aiCups').innerHTML = ai.cups.map((items, i) =>
    `<div class="cup">
       <span class="glass">${CUP_SVG}<span class="fill">${items.map(icon).join('')}</span></span>
       <small>컵 ${i + 1}</small>
     </div>`).join('');

  // 처리한 주문 · 벌점 더미
  $('aiDoneCount').textContent = ai.doneList.length;
  $('aiDoneList').innerHTML = ai.doneList.length
    ? ai.doneList.map((o) => `<span class="${o.special ? 'special' : ''}">${o.name}</span>`).join('')
    : '<small>아직 없어요</small>';
  $('aiTrashCount').textContent = ai.penalty;

  // 지금 차례인 쪽 판을 강조
  document.querySelector('.orders.me').classList.toggle('on', game.turn === 'me' && !game.over);
  document.querySelector('.orders.ai').classList.toggle('on', game.turn === 'ai' && !game.over);
}


/* ===== 가운데: 재료판 16칸 ===== */
function drawBoard() {
  const myTurn = game.turn === 'me' && !game.over;
  let html = '';

  BOARD.forEach((key, i) => {
    const item = ITEMS[key];
    const step = game.path.indexOf(i);   // 지나온 칸이면 몇 번째인지

    let cls = 'cell';
    if (item.special) cls += ' special';
    if (step >= 0) cls += ' path';
    if (step >= 0 && game.turn === 'ai') cls += ' ai';   // AI가 지나온 칸은 파랑

    // 지금 누를 수 있는 칸
    if (myPlace() && !taken(i)) cls += ' can';   // 세팅: 말을 놓을 수 있는 칸
    if (myTurn && game.step === 1 && game.path.length < maxMove()
        && neighbors(head()).includes(i)) cls += ' can';

    html += `<div class="${cls}" data-i="${i}" style="--c:${item.color}">`;
    html += `<div class="cell-in">${icon(key)}</div>`;

    // 같은 칸을 두 번 지나면 마지막 번호를 보여줌
    const lastStep = game.path.lastIndexOf(i);
    if (lastStep >= 0) html += `<span class="num">${lastStep + 1}</span>`;

    // 말: 이동 중에는 원래 자리에 흐리게
    // 말 2개: 지금 움직일 내 말은 테두리로 표시 (sel)
    const k = game.me.pawns.indexOf(i);
    if (k >= 0) {
      let cls2 = 'pawn me';
      const now = myTurn && game.step === 1 && k === game.pick;
      if (now && game.path.length) cls2 += ' ghost';
      if (now && !game.path.length) cls2 += ' sel';
      html += `<span class="${cls2}"></span>`;
    }
    if (game.ai.pawns.includes(i)) html += `<span class="pawn ai"></span>`;
    html += `</div>`;
  });

  $('board').innerHTML = html;
  $('tBoard').innerHTML = html;   // 세팅 화면의 재료판도 같은 그림
}


/* ===== 오른쪽 위: 단계 표시 ===== */
const STEPS = ['이동', '재료 담기', '주문 처리'];

function drawSteps() {
  let html = '';

  // AI 차례면 단계 표시를 파랑으로
  $('steps').className = game.turn === 'ai' ? 'steps ai' : 'steps';

  STEPS.forEach((name, i) => {
    const n = i + 1;
    let cls = '';
    const on = !game.over && !game.setup;   // 게임 끝 · 시작 재료 담는 중에는 표시 안 함
    if (on && n < game.step) cls = 'done';
    if (on && n === game.step) cls = 'now';

    const mark = cls === 'done' ? '✓' : n;
    html += `<li class="${cls}"><i>${mark}</i>${name}</li>`;
  });

  $('steps').innerHTML = html;
}


/* ===== 컵 그림 (손잡이 달린 유리컵) =====
   body: 컵 몸통 · handle: 손잡이 · shine: 반짝이는 선 */
const CUP_SVG = `
  <svg viewBox="0 0 120 100" aria-hidden="true">
    <path class="handle" d="M92 30 C112 28 116 54 90 62"/>
    <path class="body" d="M10 12 H96 V44 C96 74 78 90 53 90 C28 90 10 74 10 44 Z"/>
    <path class="shine" d="M20 22 V44 C20 58 26 68 34 74"/>
  </svg>`;


/* ===== 오른쪽 패널 ===== */

// 상황마다 바뀌는 제목 · 설명 · 버튼 글자
// sub: 왼쪽 버튼 글자 (없으면 버튼 숨김)
const GUIDE = {
  0: { title: '내 말을 놓을 칸을 고르세요',
       text: '재료판에서 원하는 칸을 누르세요.<br>AI 말(파랑)이 있는 칸은 안 돼요.' },
  setup: { title: '시작 재료를 컵에 담으세요',
           text: '말을 놓은 칸의 재료 1개를 갖고 시작해요.<br>담을 컵을 누르세요.',
           next: '버리고 시작하기' },
  1: { title: '말을 움직이세요',
       text: '옆 칸을 하나씩 눌러 1~3칸 움직여요.<br>지나온 칸의 재료를 모두 받아요.',
       sub: '되돌리기' },
  2: { title: '받은 재료를 컵에 담으세요',
       text: '재료를 고르고 담을 컵을 누르세요.<br>담기 싫은 재료는 버려요.',
       next: '남은 재료 버리기', sub: '되돌리기' },
  3: { title: '주문을 내고 차례를 끝내세요',
       text: '초록 테두리 주문을 누르면 컵을 내요.<br>다 했으면 "차례 끝내기"를 누르세요.',
       next: '차례 끝내기', sub: '되돌리기' },
  ai: { title: 'AI 바리스타 차례예요',
        text: '잠시만 기다려 주세요.' },
  over: { title: '게임이 끝났어요',
          text: '결과 창에서 점수를 확인하세요.' },
};

// 낼 수 있는 주문 하나 찾아서 문구로 (없으면 '')
function readyText() {
  for (let r = 0; r < 4; r++) {
    for (const order of game.me.queue[r]) {
      const cup = cupFor(order);
      if (cup >= 0) return `낼 수 있는 음료! 컵 ${cup + 1} = ${r + 1}단 '${order.name}'`;
    }
  }
  return '';
}

// 초록(또는 주황) 안내 줄에 들어갈 말
// 돌려주는 값: { text: 문구, warn: 주황색인지 } 또는 null(숨김)
function hintText() {
  if (game.setup) {
    return game.turn === 'ai'
      ? { text: 'AI가 선플레이어예요. 담고 나면 AI 차례가 돼요' }
      : { text: '내가 선플레이어예요. 담고 나면 내 차례가 시작돼요' };
  }
  if (game.step === 0 && game.turn === 'ai') return { text: 'AI가 먼저 시작해요. 말을 놓으면 AI 차례가 돼요' };
  if (game.over || game.turn !== 'me') return null;

  if (game.step === 1) {
    // 방금 업그레이드를 켰으면 (아직 안 움직였을 때) 알려주기
    if (game.upDone && game.path.length === 0) {
      const key = game.me.ups[game.me.ups.length - 1];
      const up = UPGRADES.find((u) => u.key === key);
      return { text: `업그레이드 '${up.name}'${josa(up.name, '을/를', true)} 켰어요 · 게임 끝까지 유지돼요` };
    }

    const left = maxMove() - game.path.length;
    const got = collect(game.path).length;   // 지금까지 지나온 칸의 재료 수

    // 다른 말이 있는 칸에서는 멈출 수 없음
    if (game.path.length && !canStop()) {
      const more = left ? '한 칸 더 가거나 ' : '';
      return { text: `다른 말이 있는 칸에서는 멈출 수 없어요. ${more}되돌리기를 누르세요`, warn: true };
    }
    // 끝까지 갔는데 러시 토큰이 남아 있으면: 멈출지, 더 갈지 고르기
    if (game.path.length && left === 0) {
      return { text: `재료 ${got}개 · 여기서 멈추거나, +1칸으로 더 가세요` };
    }
    if (got) return { text: `재료 ${got}개 · 여기서 멈추거나 ${left}칸 더 갈 수 있어요` };
    return { text: `1~${left}칸 움직일 수 있어요 · 다른 내 말을 누르면 그 말로 바꿔요` };
  }

  if (game.step === 2) {
    // 완성된 컵이 있으면 알려줌 (지금 내도 되고, 더 담아서 다른 음료를 만들어도 됨)
    const ready = readyText();
    if (ready) return { text: `${ready} · 더 담아도 돼요` };
    return null;   // 컵 위 작은 안내로 충분
  }

  if (game.step === 3) {
    const ready = readyText();
    if (ready) return { text: `${ready} · 초록 카드를 누르세요`, warn: true };
    // 낼 주문이 없으면: 차례를 끝낼 때 벌점이 생기는지 알려줌
    const lost = game.me.queue[3].length;
    if (lost) return { text: `차례를 끝내면 4단 주문 ${lost}장이 벌점이 돼요`, warn: true };
    return { text: '낼 수 있는 주문이 없어요. 차례를 끝내세요' };
  }

  return null;
}

function drawPanel() {
  // 지금 상황에 맞는 안내 고르기
  let key = game.step;
  if (game.turn === 'ai' && game.step !== 0) key = 'ai';
  if (game.setup) key = 'setup';
  if (game.over) key = 'over';
  const guide = GUIDE[key];

  $('title').textContent = guide.title;
  $('text').innerHTML = guide.text;

  // AI 차례: AI가 한 일을 한 줄씩 보여줌
  // 안내 칸 크기는 그대로 두고 그 안에서만 스크롤 (재료판이 줄어들지 않게) → 맨 아래 줄이 보이게
  const aiTurn = key === 'ai';
  document.querySelector('.panel').classList.toggle('fix', aiTurn);
  if (aiTurn && game.log.length) {
    $('text').innerHTML = `<ul class="log">${game.log.map((t) => `<li>${t}</li>`).join('')}</ul>`;
  }

  // 아래 버튼 2개
  $('nextBtn').hidden = !guide.next;
  $('nextBtn').textContent = guide.next || '';
  $('nextBtn').disabled = false;

  // 1 이동: 다 갔는데 러시 토큰이 남아 있으면 "여기서 멈추기" 버튼
  // 1 이동: 1칸 이상 갔으면 "여기서 멈추기" 버튼 (1~3칸 중 원하는 만큼)
  if (key === 1 && game.path.length >= 1) {
    $('nextBtn').hidden = false;
    $('nextBtn').textContent = '여기서 멈추기';
    $('nextBtn').disabled = !canStop();
  }

  // 3 주문 처리: 낼 수 있는 음료가 있으면 차례를 못 끝냄
  if (key === 3 && anyReady()) {
    $('nextBtn').textContent = '음료 먼저 내기';
    $('nextBtn').disabled = true;
  }
  $('subBtn').hidden = !guide.sub;
  $('subBtn').textContent = guide.sub || '';

  // 되돌릴 게 없으면 "되돌리기" 흐리게
  let canBack = false;
  if (game.step === 1) canBack = game.path.length > 0;
  if (game.step === 2 || game.step === 3) canBack = game.placed.length > 0 && !game.served && !game.setup;
  $('subBtn').disabled = !canBack;

  // 러시 토큰 "+1칸" 상자
  drawRush();

  // 안내 줄 (업그레이드 배너가 떠 있으면 숨김)
  const hint = canUpgrade() ? null : hintText();
  $('hint').hidden = !hint;
  if (hint) {
    $('hint').textContent = hint.text;
    $('hint').className = hint.warn ? 'hint warn' : 'hint';
  }

  // 받은 재료
  let picks = '';
  game.picks.forEach((key, k) => {
    const on = k === game.picked ? 'on' : '';
    picks += `<button class="pick ${on}" type="button" data-k="${k}">${icon(key)}<span>${ITEMS[key].name}</span></button>`;
  });
  $('picks').innerHTML = picks;

  // 컵 위 작은 안내
  if (game.step === 2 && game.picks.length) {
    $('cupsHint').textContent = `${josa(ITEMS[game.picks[game.picked]].name, '을/를')} 담을 컵을 누르세요`;
  } else {
    $('cupsHint').textContent = '';
  }

  // 컵 3개
  let cups = '';
  game.me.cups.forEach((items, i) => {
    const can = game.step === 2 && game.picks.length ? 'can' : '';

    // 맞는 주문이 있는 컵은 "완성" 표시 (주문 이름은 안내 줄에)
    const done = items.length > 0 && game.me.queue.flat().some((o) => same(items, o.items));
    let label = `컵 ${i + 1}`;
    if (done && (game.step === 2 || game.step === 3)) label = `<b class="cup-done">컵 ${i + 1} 완성</b>`;

    // 컵 비우기 버튼: 내 차례 담기 · 처리 단계에서, 재료가 든 컵에만
    // (완성된 컵은 먼저 내야 하므로 비우기 없음)
    const canEmpty = game.turn === 'me' && (game.step === 2 || game.step === 3)
      && !game.setup && items.length > 0 && !done;
    const empty = canEmpty
      ? `<button class="cup-empty" type="button" data-i="${i}">비우기</button>`
      : '';

    // 컵 그림 아래 한 줄: 이름 + 비우기 버튼 (컵과 겹치지 않게)
    cups += `<div class="cup-box">
               <button class="cup ${can}" type="button" data-i="${i}">
                 <span class="glass">
                   ${CUP_SVG}
                   <span class="fill">${items.map(icon).join('')}</span>
                 </span>
               </button>
               <div class="cup-foot"><small>${label}</small>${empty}</div>
             </div>`;
  });
  $('cups').innerHTML = cups;
}


/* ===== 러시 토큰 상자 (이동 단계 · 토큰이 있을 때만) ===== */
function drawRush() {
  // 내 차례 이동 단계에서는 항상 보여줌 (토큰이 없으면 버튼만 잠김)
  const show = game.turn === 'me' && game.step === 1 && !game.setup && !game.over;
  if (!show) {
    $('rushBox').innerHTML = '';
    return;
  }

  if (game.me.rush === 0) {
    $('rushBox').innerHTML = `
      <i class="coin">R</i>
      <span title="스페셜 메뉴를 내거나 벌점을 받으면 생겨요">러시 토큰 없음</span>
      <button class="rush-more" type="button" disabled>+1칸</button>`;
    return;
  }

  const left = game.me.rush - game.rushUse;   // 아직 안 쓴 토큰
  $('rushBox').innerHTML = `
    <i class="coin">R</i>
    <span>사용 <b>${game.rushUse}</b> · 남은 ${left}</span>
    <button class="rush-less" type="button" ${game.rushUse ? '' : 'disabled'}>취소</button>
    <button class="rush-more" type="button" ${left ? '' : 'disabled'}>+1칸</button>`;
}


/* ===== 업그레이드 배너 (차례 시작 때만) ===== */
function drawUpgrade() {
  if (!canUpgrade()) {
    $('up').innerHTML = '';
    return;
  }

  // 고른 타일이 있으면 "켜기" 버튼을 글 옆에 붙임
  const up = UPGRADES.find((u) => u.key === game.upPick);
  let html = `<div class="up-head">
                <b>${up ? `'${up.name}'${josa(up.name, '을/를', true)} 켤까요?` : '업그레이드할 수 있어요'}</b>
                <small>${up ? '처리한 주문 3장을 써요 · +2점' : '왼쪽 판에서 타일을 고르세요 · 안 켜려면 그냥 움직이세요'}</small>
              </div>`;
  if (up) html += `<button class="up-btn" type="button">켜기</button>`;

  $('up').innerHTML = html;
}


/* ===== 게임 끝: 결과 창 ===== */
function drawResult() {
  $('result').hidden = !game.over;
  if (!game.over) return;

  const me = game.me;
  const ai = game.ai;
  const myName = nickname ? `${nickname} 바리스타` : '나';
  const win = winner();

  // 맨 위 큰 글자
  let head = '공동 승리!';
  if (win === 'me') head = '승리했어요!';
  if (win === 'ai') head = '아쉽게 졌어요';
  $('resultTitle').textContent = head;
  $('resultTitle').className = 'result-title ' + win;
  $('resultReason').textContent = `${endReason()} · ${game.round}라운드`;

  // 점수표 한 줄: 이름 | 내 값 | AI 값
  const line = (name, a, b) => `<tr><th>${name}</th><td>${a}</td><td>${b}</td></tr>`;

  $('resultTable').innerHTML = `
    <tr class="names"><th></th><td>${myName}</td><td>AI 바리스타</td></tr>
    ${line('처리한 주문 (×1)', `+${me.done}`, `+${ai.done}`)}
    ${line('업그레이드 (×2)', `+${me.ups.length * 2}`, `+${ai.ups.length * 2}`)}
    ${line('벌점 (×1)', `−${me.penalty}`, `−${ai.penalty}`)}
    ${line('러시 토큰 (동점일 때)', me.rush, ai.rush)}
    <tr class="total"><th>합계</th><td>${score(me)}점</td><td>${score(ai)}점</td></tr>`;
}


/* ===== 세팅 화면 (게임 시작 전 테이블) ===== */

// 한 사람 자리: 이름 → 개인 판(업그레이드 타일 · 주문 1~4단) → 컵 3개
function seatHTML(p, name, isMe) {
  const first = (game.first === 'me') === isMe;   // 이 사람이 선플레이어인지
  const canCup = isMe && game.setup && game.picks.length > 0;

  let cups = '';
  p.cups.forEach((items, i) => {
    cups += `<button class="cup ${canCup ? 'can' : ''}" type="button" data-i="${i}">
               <span class="glass">${CUP_SVG}<span class="fill">${items.map(icon).join('')}</span></span>
               <small>컵 ${i + 1}</small>
             </button>`;
  });

  return `<div class="seat-head"><b>${name}</b><small>${first ? '선플레이어' : '후플레이어'}</small></div>
          <div class="pboard">
            <div class="tiles">${tilesHTML(p, false)}</div>
            <div class="rows">${rowsHTML(p, false)}</div>
          </div>
          <div class="cups">${cups}</div>`;
}

function drawTable() {
  $('table').hidden = !game.table;
  $('gameMain').hidden = game.table;
  if (!game.table) return;

  const myName = nickname ? `${nickname} 바리스타` : '나';
  $('seatMe').innerHTML = seatHTML(game.me, myName, true);
  $('seatAi').innerHTML = seatHTML(game.ai, 'AI 바리스타', false);

  // 재료 토큰: 위 4개 · 아래 4개. 지금 가져올 재료는 강조
  let supply = '<p class="supply-name">재료 토큰</p><div class="trays">';
  Object.keys(ITEMS).forEach((key) => {
    const on = game.picks.includes(key) ? 'on' : '';
    supply += `<div class="tray ${on}">
                 <span class="pile">${icon(key)}${icon(key)}${icon(key)}</span>
                 <small>${ITEMS[key].name}</small>
               </div>`;
  });
  $('supply').innerHTML = supply + '</div>';

  // 안내 띠: 지금 할 일 하나만 크게
  // 말은 2개씩, 선플레이어부터 번갈아 하나씩 놓음 (놓을 때마다 그 칸의 재료 1개)
  const ready = allPlaced() && !game.setup;   // 말 4개 다 놓고 컵까지 담았음
  const nth = game.setup ? game.me.pawns.length : game.me.pawns.length + 1;   // 내 몇 번째 말인지
  const firstSub = game.first === 'me' ? '내가 선플레이어예요' : 'AI가 선플레이어예요';
  let num = 1;
  let msg = `재료판에서 ${nth === 1 ? '첫' : '두'} 번째 말을 놓으세요 (${nth}/2)`;
  let sub = firstSub;
  if (game.setup) {
    num = 2;
    msg = `${icon(game.picks[0])} ${ITEMS[game.picks[0]].name} 토큰을 담을 내 컵을 누르세요`;
    sub = '다른 칸으로 바꾸려면 재료판을 다시 누르세요';
  }
  if (ready) {
    num = 3;
    msg = '준비 끝! "게임 시작"을 누르세요';
    sub = firstSub;
  }
  const steps = ['말 놓기', '재료 담기', '게임 시작']
    .map((t, k) => `<span class="${k + 1 === num ? 'now' : ''}">${k + 1} ${t}</span>`).join(' › ');

  $('setupBand').innerHTML = `<i>${num}</i><div><b>${msg}</b><small>${sub}</small></div><p>${steps}</p>`;
  $('startBtn').disabled = !ready;

  // 난이도 고르기 (게임 시작 버튼 왼쪽)
  const modes = [
    { key: 'easy', name: '쉬움', desc: '러시 토큰 2개로 시작' },
    { key: 'normal', name: '보통', desc: '원작 규칙 그대로' },
  ];
  $('modeBox').innerHTML = '<b>난이도</b>' + modes.map((m) =>
    `<button class="${mode === m.key ? 'on' : ''}" type="button" data-mode="${m.key}">
       ${m.name}<small>${m.desc}</small>
     </button>`).join('');
}


/* ===== 전부 그리기 ===== */
function draw() {
  drawTop();
  drawQueue();
  drawAiSide();
  drawBoard();
  drawSteps();
  drawPanel();
  drawUpgrade();
  drawResult();
  drawTable();

  // AI 차례: 기록의 맨 아래(방금 한 일)가 보이게 스크롤
  if (game.turn === 'ai') {
    $('text').scrollTop = $('text').scrollHeight;
  }
}
