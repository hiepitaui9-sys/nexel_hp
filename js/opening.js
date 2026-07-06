/**
 * NEXEL HP - Opening Animation
 * "Break & Build" (Gold blocks scattering and reforming into logo)
 */
(function() {
  // セッションストレージによる制御（1回のみ再生）
  // 開発時などの強制再生用に URL パラメータ ?op=true をサポート
  const urlParams = new URLSearchParams(window.location.search);
  const forcePlay = urlParams.get('op') === 'true';
  const hasPlayed = sessionStorage.getItem('nexel_opening_played');

  if (hasPlayed && !forcePlay) {
    // すでに再生済みの場合は何もせず終了（CSS側の制御で非表示にする）
    document.documentElement.classList.add('opening-skipped');
    window.addEventListener('DOMContentLoaded', () => {
      const slide = document.querySelector('.hero__bg-slide');
      if (slide) slide.classList.add('is-active');
    });
    return;
  }

  // アニメーション実行中の目印クラスをhtml要素に付与
  document.documentElement.classList.add('opening-active');
  
  window.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('opening-animation');
    const canvas = document.getElementById('opening-canvas');
    if (!container || !canvas) return;

    // 表示する
    container.style.display = 'flex';

    // スクロールを禁止
    document.body.classList.add('overflow-hidden');

    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    // Retinaディスプレイ対応
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    // アニメーション状態変数
    let phase = 0; // 0: 準備, 1: 爆発（壊す）, 2: 収束（創る）, 3: 完成（輝き）, 4: 終了
    let phaseTimer = 0;
    
    // ロゴのピクセルデータを生成する一時キャンバス
    const logoScale = width < 768 ? 1.4 : 2.2;
    const logoW = 160 * logoScale;
    const logoH = 48 * logoScale;
    
    const offCanvas = document.createElement('canvas');
    const offCtx = offCanvas.getContext('2d');
    offCanvas.width = logoW;
    offCanvas.height = logoH;

    // 一時キャンバスにロゴを描画
    offCtx.clearRect(0, 0, logoW, logoH);
    
    // NXL 描画 (ゴールド)
    offCtx.fillStyle = '#c5a059';
    offCtx.font = `bold ${Math.round(14 * logoScale)}px "Georgia", "Times New Roman", serif`;
    offCtx.textBaseline = 'top';
    const nxlSpacing = 0.15 * 14 * logoScale;
    drawTextWithSpacing(offCtx, 'NXL', 0, 0, nxlSpacing);

    // NEXEL 描画 (ホワイト)
    offCtx.fillStyle = '#ffffff';
    offCtx.font = `bold ${Math.round(22 * logoScale)}px "Helvetica Neue", "Arial", sans-serif`;
    offCtx.textBaseline = 'top';
    const nexelSpacing = 0.35 * 22 * logoScale;
    drawTextWithSpacing(offCtx, 'NEXEL', 0, 22 * logoScale, nexelSpacing);

    function drawTextWithSpacing(context, text, x, y, spacing) {
      let currentX = x;
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        context.fillText(char, currentX, y);
        currentX += context.measureText(char).width + spacing;
      }
    }

    // ロゴピクセルの抽出
    const imgData = offCtx.getImageData(0, 0, logoW, logoH);
    const pixels = [];
    const step = width < 768 ? 3 : 4; // モバイルは細かく、デスクトップは適度な間隔
    
    const logoOffsetX = (width - logoW) / 2;
    const logoOffsetY = (height - logoH) / 2;

    for (let y = 0; y < logoH; y += step) {
      for (let x = 0; x < logoW; x += step) {
        const index = (y * logoW + x) * 4;
        const alpha = imgData.data[index + 3];
        if (alpha > 128) {
          const r = imgData.data[index];
          const g = imgData.data[index + 1];
          const b = imgData.data[index + 2];
          
          pixels.push({
            tx: logoOffsetX + x,
            ty: logoOffsetY + y,
            color: `rgb(${r},${g},${b})`
          });
        }
      }
    }

    // パーティクルの初期化
    const particles = [];
    
    // 画面全体を覆うグリッドセルの計算
    const cellSize = width < 768 ? 20 : 30;
    const cols = Math.ceil(width / cellSize);
    const rows = Math.ceil(height / cellSize);
    const totalCells = cols * rows;

    const particleCount = pixels.length;

    for (let i = 0; i < particleCount; i++) {
      // 画面全体に散らばるグリッド状の初期位置を割り当てる
      const gridIndex = Math.floor((i / particleCount) * totalCells);
      const col = gridIndex % cols;
      const row = Math.floor(gridIndex / cols);
      const gridX = col * cellSize + (cellSize / 2) + (Math.random() - 0.5) * (cellSize * 0.4);
      const gridY = row * cellSize + (cellSize / 2) + (Math.random() - 0.5) * (cellSize * 0.4);

      const px = pixels[i];
      
      // ゴールド/黄色系のカラーバリエーション
      const goldColors = [
        '#c5a059', // メインゴールド
        '#dfb76c', // ライトゴールド
        '#ffd700', // イエローゴールド
        '#b38f43', // ミディアムゴールド
        '#e6c387'  // ブライトゴールド
      ];
      const initialGold = goldColors[Math.floor(Math.random() * goldColors.length)];

      particles.push({
        x: gridX,
        y: gridY,
        ix: gridX,
        iy: gridY,
        tx: px.tx,
        ty: px.ty,
        vx: 0,
        vy: 0,
        size: cellSize * (0.8 + Math.random() * 0.3), // 最初は画面を埋め尽くす大きいサイズ
        targetSize: 2.2, // ロゴになったときのパーティクルサイズ
        angle: 0,
        angularSpeed: 0,
        color: '#000000', // 最初は画面と同化する黒いグリッドブロック
        goldColor: initialGold,
        targetColor: px.color,
        state: 'grid' // grid, exploded, assembling
      });
    }

    // アニメーションループ
    let lastTime = 0;
    let animationFrameId = null;

    function updateAndDraw(time) {
      if (!lastTime) lastTime = time;
      const dt = time - lastTime;
      lastTime = time;

      // 画面クリア（少し透明度を持たせて残像を作る）
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(0, 0, width, height);

      phaseTimer += dt;

      // フェーズの遷移
      if (phase === 0 && phaseTimer > 600) {
        // Phase 1: 爆発（壊す）開始
        phase = 1;
        phaseTimer = 0;
        
        const centerX = width / 2;
        const centerY = height / 2;
        
        particles.forEach(p => {
          p.state = 'exploded';
          // 中心からのベクトル
          const dx = p.x - centerX;
          const dy = p.y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          
          // 爆発の強さ（中心に近いほど強く、ランダム性も持たせる）
          const force = (800 / dist) + Math.random() * 15 + 4;
          
          p.vx = (dx / dist) * force + (Math.random() - 0.5) * 8;
          p.vy = (dy / dist) * force - Math.random() * 12 - 3; // 少し上方向に弾け飛ばす
          p.angularSpeed = (Math.random() - 0.5) * 0.4;
          p.color = p.goldColor; // ゴールドに変貌
          p.size = Math.random() * 8 + 4; // 砕けて小さくなる
        });
      } else if (phase === 1 && phaseTimer > 1500) {
        // Phase 2: 収束（創る）開始
        phase = 2;
        phaseTimer = 0;
      } else if (phase === 2 && phaseTimer > 2000) {
        // Phase 3: 完成（輝き）
        phase = 3;
        phaseTimer = 0;
        
        // 背景画像のグラデーション表示アニメーションを開始
        const slide = document.querySelector('.hero__bg-slide');
        if (slide) slide.classList.add('is-active');
      } else if (phase === 3 && phaseTimer > 1500) {
        // Phase 4: 終了（フェードアウト）
        phase = 4;
        container.classList.add('fade-out');
        sessionStorage.setItem('nexel_opening_played', 'true');
        
        setTimeout(() => {
          document.body.classList.remove('overflow-hidden');
          container.style.display = 'none';
          cancelAnimationFrame(animationFrameId);
        }, 800); // style.cssのtransition時間と合わせる
      }

      // 各パーティクルの更新と描画
      particles.forEach(p => {
        if (phase === 0) {
          // 静止グリッド状態
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
        }
        else if (phase === 1) {
          // 爆発物理演算（重力と空気抵抗）
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.22; // 重力
          p.vx *= 0.95; // 空気抵抗
          p.vy *= 0.95;
          p.angle += p.angularSpeed;

          // 画面端バウンド
          if (p.x < 0) { p.x = 0; p.vx *= -0.4; }
          if (p.x > width) { p.x = width; p.vx *= -0.4; }
          if (p.y > height) { p.y = height; p.vy *= -0.3; }

          // 描画
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
          ctx.restore();
        }
        else if (phase >= 2) {
          // 収束と組み立て
          const dx = p.tx - p.x;
          const dy = p.ty - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // 経過時間に応じてイージングの強さを動的に変え、吸い寄せ感を出す
          const ease = Math.min(0.02 + (phaseTimer / 1500) * 0.08, 0.12);
          
          p.vx += dx * ease - p.vx * 0.25;
          p.vy += dy * ease - p.vy * 0.25;
          
          p.x += p.vx;
          p.y += p.vy;
          
          // 回転角を 0 に収束
          p.angle += (0 - p.angle) * 0.12;

          // 近づくにつれてサイズと色をターゲットに近づける
          if (dist < 120) {
            const ratio = (120 - dist) / 120;
            p.color = blendColors(p.goldColor, p.targetColor, ratio);
            p.size += (p.targetSize - p.size) * 0.15;
          } else {
            p.color = p.goldColor;
          }

          // 完全到達
          if (dist < 1.0) {
            p.x = p.tx;
            p.y = p.ty;
            p.vx = 0;
            p.vy = 0;
            p.angle = 0;
            p.color = p.targetColor;
            p.size = p.targetSize;
          }

          // 描画
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
          ctx.restore();
        }
      });

      // ロゴ完成後のスキャン（輝き）エフェクト
      if (phase === 3) {
        const progress = Math.min(phaseTimer / 1200, 1.2);
        const scanX = logoOffsetX - 150 + (logoW + 300) * progress;
        
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        
        // 輝きのグラデーション
        const grad = ctx.createLinearGradient(scanX - 60, 0, scanX + 60, 0);
        grad.addColorStop(0, 'rgba(197, 160, 89, 0)');
        grad.addColorStop(0.3, 'rgba(255, 230, 170, 0.45)');
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
        grad.addColorStop(0.7, 'rgba(255, 230, 170, 0.45)');
        grad.addColorStop(1, 'rgba(197, 160, 89, 0)');
        
        ctx.fillStyle = grad;
        // ロゴ描画領域にのみグローを走らせる
        ctx.fillRect(logoOffsetX - 50, logoOffsetY - 20, logoW + 100, logoH + 40);
        
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(updateAndDraw);
    }

    // HEXカラーとRGBカラーのブレンド
    function blendColors(hexColor, rgbColorStr, ratio) {
      const r1 = parseInt(hexColor.substring(1, 3), 16);
      const g1 = parseInt(hexColor.substring(3, 5), 16);
      const b1 = parseInt(hexColor.substring(5, 7), 16);

      let r2 = 255, g2 = 255, b2 = 255;
      const rgbMatch = rgbColorStr.match(/\d+/g);
      if (rgbMatch) {
        r2 = parseInt(rgbMatch[0]);
        g2 = parseInt(rgbMatch[1]);
        b2 = parseInt(rgbMatch[2]);
      }

      const r = Math.round(r1 + (r2 - r1) * ratio);
      const g = Math.round(g1 + (g2 - g1) * ratio);
      const b = Math.round(b1 + (b2 - b1) * ratio);

      return `rgb(${r},${g},${b})`;
    }

    // リサイズハンドラ
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const prevWidth = width;
        const prevHeight = height;
        
        width = window.innerWidth;
        height = window.innerHeight;
        
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.scale(dpr, dpr);
        
        const newLogoOffsetX = (width - logoW) / 2;
        const newLogoOffsetY = (height - logoH) / 2;
        
        // 各パーティクルのターゲット位置と現在位置をリサイズに合わせて更新
        particles.forEach((p, idx) => {
          const px = pixels[idx];
          if (px) {
            const rx = px.tx - (prevWidth - logoW) / 2;
            const ry = px.ty - (prevHeight - logoH) / 2;
            p.tx = newLogoOffsetX + rx;
            p.ty = newLogoOffsetY + ry;
            
            // 進行状況に合わせて現在位置も補正
            if (phase === 0) {
              // グリッド位置も再計算
              const gridIndex = Math.floor((idx / particleCount) * totalCells);
              const col = gridIndex % cols;
              const row = Math.floor(gridIndex / cols);
              p.x = col * cellSize + (cellSize / 2);
              p.y = row * cellSize + (cellSize / 2);
            }
          }
        });
      }, 200);
    });

    // 開始
    requestAnimationFrame(updateAndDraw);
  });
})();
