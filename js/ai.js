/* =========================================================
   커피 러시 - AI 바리스타 차례
   (규칙 도우미는 game.js에 있는 것을 같이 씀)

   AI가 하는 일
   0 업그레이드: 처리한 주문이 3장 이상이면 켬
   1 이동: 갈 수 있는 1~3칸 길을 모두 따져 보고, 지나온 칸의 재료가 제일 쓸모 있는 길로
          (러시 토큰이 있으면 더 좋을 때 씀)
   2 담기: 더 이상 어떤 주문도 될 수 없는 컵은 비우고,
          받은 재료를 주문에 맞게 가는 컵에 담음 (쓸 곳 없는 재료는 버림)
   3 처리: 낼 수 있는 주문은 모두 냄 (아래 단부터)
   4 차례 끝
   ========================================================= */


// ms(1000 = 1초)만큼 기다리기 → 화면에서 AI가 움직이는 게 보이도록
function wait(ms) {
  return new Promise((done) => setTimeout(done, ms));
}

// 오른쪽 패널에 AI가 한 일 한 줄 남기기
function say(text) {
  game.log.push(text);
  draw();
}


/* ===== AI 생각하기 ===== */

// 이 재료를 어느 컵에 담으면 제일 좋은지
// 돌려주는 값: { cup: 컵 번호(-1이면 쓸 곳 없음), score: 점수 }
function bestCup(p, key) {
  let best = { cup: -1, score: 0 };

  p.cups.forEach((cup, c) => {
    const next = [...cup, key];   // 이 컵에 담았을 때

    p.queue.forEach((row, r) => {
      row.forEach((order) => {
        if (!partOf(next, order.items)) return;   // 레시피와 안 맞으면 패스

        // 시간 안에 못 끝내는 주문은 패스
        // (r단 주문은 이번 차례 포함 4 - r 차례 남음, 한 차례에 재료 1개)
        const need = order.items.length - next.length;
        if (need > 3 - r) return;

        // 점수: 컵이 많이 찰수록 + 완성되면 크게 + 급한 주문(아래 단)일수록 조금 더
        let score = next.length * 4 + r;
        if (need === 0) score += 20;

        if (score > best.score) best = { cup: c, score: score };
      });
    });
  });

  return best;
}

// steps칸으로 갈 수 있는 길을 모두 찾기
// k = 움직일 말 번호 (말이 2개)
// 돌려주는 값: [[칸, 칸, 칸], [칸, 칸, 칸], ...]
function allPaths(p, steps, k) {
  const paths = [];

  function go(path) {
    if (path.length === steps) {
      paths.push(path);
      return;
    }
    const now = path.length ? path[path.length - 1] : p.pawns[k];
    neighbors(now, p).forEach((n) => go([...path, n]));
  }

  go([]);

  // 마지막 칸에 다른 말이 있으면 못 멈춤 (지나가는 건 됨)
  return paths.filter((path) => !blocked(path[path.length - 1], p, k));
}

// 받은 재료들을 컵에 담아 보면 몇 점짜리인지 (실제로 담지는 않음)
function tryPicks(p, picks) {
  const real = p.cups;
  p.cups = real.map((cup) => cup.slice());   // 컵을 복사해서 연습
  let total = 0;
  picks.forEach((key) => {
    const pick = bestCup(p, key);
    if (pick.cup >= 0) {
      p.cups[pick.cup].push(key);
      total += pick.score;
    }
  });
  p.cups = real;                               // 원래 컵으로 되돌림
  return total;
}

// 제일 좋은 길 고르기 (점수가 같으면 무작위)
// 러시 토큰은 2개까지 써 봄. 토큰 1개 쓸 때마다 점수 -3 (아껴 쓰도록)
// 쉬움 모드: 반은 아무 길로 가고, 러시 토큰은 안 씀
// 말 2개를 모두 따져 봄. 돌려주는 값: { path: 길, k: 움직일 말 번호 }
function bestPath(p) {
  const pawns = p.pawns.map((cell, k) => k);

  if (mode === 'easy' && rand(2) === 0) {
    const k = pawns[rand(pawns.length)];
    const paths = allPaths(p, 3, k);
    return { path: paths[rand(paths.length)], k: k };
  }

  let best = null;
  let bestScore = -1;

  const extra = mode === 'easy' ? 0 : Math.min(p.rush, 2);
  pawns.forEach((k) => {
    // 1칸 ~ 3칸 (러시 토큰이 있으면 더). 3칸을 넘는 칸마다 점수 -3
    for (let n = 1; n <= 3 + extra; n++) {
      const more = Math.max(0, n - 3);
      shuffle(allPaths(p, n, k)).forEach((path) => {
        const score = tryPicks(p, collect(path, p)) - more * 3;
        if (score > bestScore) {
          best = { path: path, k: k };
          bestScore = score;
        }
      });
    }
  });

  return best;
}


/* ===== AI 차례 진행 ===== */

// 낼 수 있는 주문을 모두 냄 (4단부터 위로)
async function aiServe() {
  const ai = game.ai;
  for (let r = 3; r >= 0; r--) {
    for (let k = ai.queue[r].length - 1; k >= 0; k--) {
      const name = ai.queue[r][k].name;
      if (serve(ai, r, k)) {
        say(`${r + 1}단 '${name}'${josa(name, '을/를', true)} 처리했어요 → 내 1단에 주문 1장`);
        await wait(800);
      }
    }
  }
}

async function aiTurn() {
  const ai = game.ai;
  game.step = 1;
  game.path = [];
  game.log = [];
  draw();
  await wait(700);

  // 0 업그레이드: 처리한 주문 3장 이상이면 안 켠 것 중 맨 앞 것
  if (ai.done >= 3 && ai.ups.length < 4) {
    const up = UPGRADES.find((u) => !has(u.key, ai));
    ai.done -= 3;
    ai.doneList.splice(0, 3);
    ai.ups.push(up.key);
    say(`업그레이드 '${up.name}'${josa(up.name, '을/를', true)} 켰어요`);
    await wait(900);
  }

  // 1 이동: 말 2개 중 하나를 골라 한 칸씩 움직이는 모습 보여주기
  const best = bestPath(ai);
  const path = best.path;
  game.aiPick = best.k;
  for (const cell of path) {
    game.path.push(cell);
    ai.pawns[best.k] = cell;
    draw();
    await wait(450);
  }

  // 3칸 넘게 갔으면 그만큼 러시 토큰 사용
  const used = path.length - 3;
  if (used > 0) {
    ai.rush -= used;
    say(`러시 토큰 ${used}개를 써서 더 움직였어요`);
  }

  // 지나온 칸의 재료를 모두 받음
  const picks = collect(path, ai);
  say(`재료 ${picks.length}개를 받았어요 ${picks.map(icon).join('')}`);
  await wait(700);

  // 2 담기
  game.step = 2;

  // 어떤 주문에도 맞지 않게 된 컵은 비움
  ai.cups.forEach((cup, c) => {
    if (cup.length === 0) return;
    const useful = ai.queue.flat().some((order) => partOf(cup, order.items));
    if (!useful) {
      ai.cups[c] = [];
      say(`컵 ${c + 1}${josa(String(c + 1), '을/를', true)} 비웠어요`);
    }
  });

  for (const key of picks) {
    await aiServe();   // 완성된 컵이 있으면 먼저 주문 처리
    const pick = bestCup(ai, key);
    if (pick.cup >= 0) {
      ai.cups[pick.cup].push(key);
      say(`${icon(key)} ${ITEMS[key].name} → 컵 ${pick.cup + 1}`);
    } else {
      say(`${icon(key)} ${josa(ITEMS[key].name, '은/는')} 쓸 곳이 없어서 버렸어요`);
    }
    await wait(500);
  }

  // 3 처리: 낼 수 있는 주문은 모두 냄
  game.step = 3;
  draw();
  await aiServe();

  // 4 차례 끝
  game.step = 4;
  const lost = ai.queue[3].length;
  if (lost) say(`4단 주문 ${lost}장이 벌점이 됐어요`);
  else say('차례를 마쳤어요');
  await wait(900);

  endTurn(ai);
  nextTurn();
}
