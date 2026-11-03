import type { CSSProperties, ReactNode } from 'react';
import { useMemo } from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import { findFormation } from '~/lib/formations';
import { prng } from '~/lib/prng';
import { type CloudStep, DroneCloud, fade } from './DroneCloud';
import { COLORS, FONT_DESIGN, FONT_MINCHO, FONT_SANS, HEIGHT, WIDTH } from './theme';

/*
 * 構成（30fps）
 *   0–150   オープニング：地上の機体が離陸して球体になり、タイトルが出る
 * 150–540   演目：単螺旋 → 熊 → 立方体 → 心臓 → 銀河 と組み替わる
 * 540–870   画面紹介：観賞・振付・機体・運航の 4 画面
 * 870–1020  締め：銀河の下にタイトルと URL
 */
export const SCENES = {
  opening: { from: 0, dur: 150 },
  formations: { from: 150, dur: 390 },
  features: { from: 540, dur: 330 },
  outro: { from: 870, dur: 150 },
} as const;
export const TOTAL_FRAMES = SCENES.outro.from + SCENES.outro.dur;

const FORMATION_ORDER = ['helix', 'bear', 'cube', 'heart', 'galaxy'] as const;
/** 銀河は平たい円盤なので、斜め上から見下ろす */
const GALAXY_TILT = -0.85;
const FORMATION_SLOT = SCENES.formations.dur / FORMATION_ORDER.length; // 78

/** 冒頭から演目シーンの終わりまで、点群は一続きで動かす */
const MAIN_STEPS: CloudStep[] = [
  { id: 'ground', frame: 0, morph: 1 },
  { id: 'sphere', frame: 12, morph: 80 },
  ...FORMATION_ORDER.map((id, i) => ({
    id,
    frame: SCENES.formations.from + i * FORMATION_SLOT,
    morph: 34,
    tilt: id === 'galaxy' ? GALAXY_TILT : undefined,
  })),
];

const OUTRO_STEPS: CloudStep[] = [{ id: 'galaxy', frame: 0, morph: 1, tilt: GALAXY_TILT }];

export function Intro() {
  const frame = useCurrentFrame();
  const mainEnd = SCENES.features.from;
  const cloudOpacity = interpolate(frame, [mainEnd - 20, mainEnd], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // オープニングではタイトルの上に小さめに置き、演目に入るところで中央へ下ろす
  const toCenter = interpolate(
    frame,
    [SCENES.formations.from - 20, SCENES.formations.from + 20],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.inOut(Easing.cubic),
    }
  );
  const cloudY = interpolate(toCenter, [0, 1], [HEIGHT / 2 - 150, HEIGHT / 2 + 20]);
  const cloudScale = interpolate(toCenter, [0, 1], [2.9, 3.6]);
  // 演目の説明文は左に出るので、点群は少し右へ寄せる
  const cloudX = interpolate(toCenter, [0, 1], [WIDTH / 2, WIDTH / 2 + 130]);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.sky0, fontFamily: FONT_SANS }}>
      <Sky />
      {frame < mainEnd && (
        <DroneCloud
          steps={MAIN_STEPS}
          cx={cloudX}
          cy={cloudY}
          scale={cloudScale}
          opacity={cloudOpacity}
        />
      )}

      <Sequence from={SCENES.opening.from} durationInFrames={SCENES.opening.dur}>
        <Opening />
      </Sequence>
      <Sequence from={SCENES.formations.from} durationInFrames={SCENES.formations.dur}>
        <FormationLabels />
      </Sequence>
      <Sequence from={SCENES.features.from} durationInFrames={SCENES.features.dur}>
        <Features />
      </Sequence>
      <Sequence from={SCENES.outro.from} durationInFrames={SCENES.outro.dur}>
        <Outro />
      </Sequence>
      <CornerTicks />
    </AbsoluteFill>
  );
}

/* ---------- 背景 ---------- */

/** アプリの #stars-bg と同じグラデーションに、ゆっくり瞬く星を重ねる */
function Sky() {
  const frame = useCurrentFrame();
  const stars = useMemo(() => {
    const rnd = prng(7);
    return Array.from({ length: 220 }, () => ({
      x: rnd() * WIDTH,
      y: rnd() * HEIGHT,
      r: 0.6 + rnd() * 1.4,
      phase: rnd() * Math.PI * 2,
    }));
  }, []);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 80% 40% at 50% 100%, #1e2a4a66, transparent 70%),
          radial-gradient(ellipse at 70% 20%, #0e153088, transparent 55%),
          radial-gradient(ellipse at 50% 50%, ${COLORS.sky1}, ${COLORS.sky0} 80%)`,
      }}
    >
      <svg width={WIDTH} height={HEIGHT} style={{ position: 'absolute', inset: 0 }}>
        {stars.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill="#fff"
            opacity={0.18 + 0.22 * (0.5 + 0.5 * Math.sin(frame * 0.05 + s.phase))}
          />
        ))}
      </svg>
    </AbsoluteFill>
  );
}

/** 画面四隅の目盛り。アプリの .corner-tick と同じ意匠 */
function CornerTicks() {
  const base: CSSProperties = {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: COLORS.hair,
  };
  return (
    <>
      <div
        style={{ ...base, left: 36, top: 36, borderLeft: '1px solid', borderTop: '1px solid' }}
      />
      <div
        style={{ ...base, right: 36, top: 36, borderRight: '1px solid', borderTop: '1px solid' }}
      />
      <div
        style={{
          ...base,
          left: 36,
          bottom: 36,
          borderLeft: '1px solid',
          borderBottom: '1px solid',
        }}
      />
      <div
        style={{
          ...base,
          right: 36,
          bottom: 36,
          borderRight: '1px solid',
          borderBottom: '1px solid',
        }}
      />
    </>
  );
}

/* ---------- 共通の文字 ---------- */

function rise(frame: number, delay: number, dist = 24) {
  const t = interpolate(frame, [delay, delay + 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  return { opacity: t, transform: `translateY(${(1 - t) * dist}px)` };
}

function Kicker({ children, color = COLORS.pink }: { children: ReactNode; color?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        fontFamily: FONT_DESIGN,
        fontSize: 20,
        letterSpacing: '0.32em',
        color,
      }}
    >
      <span style={{ width: 44, height: 1, background: color }} />
      {children}
    </div>
  );
}

/* ---------- 0–150 オープニング ---------- */

function Opening() {
  const frame = useCurrentFrame();
  const out = fade(frame, SCENES.opening.dur, 1, 18);
  return (
    <AbsoluteFill
      style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 96, opacity: out }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ ...rise(frame, 40), display: 'flex', justifyContent: 'center' }}>
          <Kicker>A FLOCK OF 660 ARTIFICIAL STARS</Kicker>
        </div>
        <div
          style={{
            ...rise(frame, 52, 32),
            fontFamily: FONT_MINCHO,
            fontSize: 132,
            letterSpacing: '0.14em',
            color: '#fff',
            marginTop: 18,
            textShadow: '0 0 40px rgba(49,169,199,0.35)',
          }}
        >
          星群
        </div>
        <div
          style={{
            ...rise(frame, 64),
            fontFamily: FONT_DESIGN,
            fontWeight: 300,
            fontSize: 30,
            letterSpacing: '0.6em',
            color: COLORS.glow,
            marginTop: 4,
          }}
        >
          ASTRA FLOCK
        </div>
        <div
          style={{
            ...rise(frame, 80),
            fontSize: 30,
            color: COLORS.text,
            marginTop: 30,
            letterSpacing: '0.08em',
          }}
        >
          660 機のドローンショーを、ブラウザで。
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ---------- 150–540 演目 ---------- */

function FormationLabels() {
  const frame = useCurrentFrame();
  const slot = Math.min(FORMATION_ORDER.length - 1, Math.floor(frame / FORMATION_SLOT));
  const local = frame - slot * FORMATION_SLOT;
  const f = findFormation(FORMATION_ORDER[slot]!)!;
  const index =
    ['sphere', 'helix', 'torus', 'wave', 'bear', 'dna', 'cube', 'heart', 'galaxy'].indexOf(f.id) +
    1;
  const vis = fade(local, FORMATION_SLOT, 14, 12);

  return (
    <AbsoluteFill style={{ padding: '150px 120px' }}>
      <div style={{ opacity: Math.min(1, frame / 14) }}>
        <Kicker>NOW SHOWING — 演目</Kicker>
      </div>
      <div style={{ opacity: vis, transform: `translateX(${(1 - vis) * -24}px)`, marginTop: 26 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, color: '#fff' }}>
          <span style={{ fontFamily: FONT_DESIGN, fontWeight: 300, fontSize: 120, lineHeight: 1 }}>
            {String(index).padStart(2, '0')}
          </span>
          <span
            style={{
              fontFamily: FONT_DESIGN,
              fontWeight: 300,
              fontSize: 36,
              color: COLORS.textDim,
            }}
          >
            /09
          </span>
        </div>
        <div style={{ fontFamily: FONT_MINCHO, fontSize: 84, color: '#fff', marginTop: 14 }}>
          {f.jp}
        </div>
        <div
          style={{
            fontFamily: FONT_DESIGN,
            fontSize: 24,
            letterSpacing: '0.28em',
            color: f.color,
            marginTop: 8,
            textTransform: 'uppercase',
          }}
        >
          {f.en}
        </div>
        <div
          style={{
            width: 560,
            fontSize: 24,
            lineHeight: 1.8,
            color: COLORS.textDim,
            marginTop: 28,
          }}
        >
          {f.desc}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          right: 120,
          bottom: 120,
          textAlign: 'right',
          fontFamily: FONT_DESIGN,
          color: COLORS.textDim,
          fontSize: 22,
          letterSpacing: '0.2em',
          opacity: Math.min(1, frame / 20),
        }}
      >
        9 FORMATIONS · 06:08
      </div>
    </AbsoluteFill>
  );
}

/* ---------- 540–870 画面紹介 ---------- */

type Feature = { image: string; no: string; jp: string; en: string; lines: string[] };

const FEATURES: Feature[] = [
  {
    image: 'show.jpg',
    no: '01',
    jp: '観賞',
    en: 'SHOW',
    lines: [
      '660 機 × 9 演目を 3D で観賞',
      '観客・機体目線・360° の 3 つの視点',
      'Web Audio で生成する環境音楽',
    ],
  },
  {
    image: 'choreo.jpg',
    no: '02',
    jp: '振付',
    en: 'CHOREOGRAPHY',
    lines: [
      '演目の並び替えとパラメータ調整',
      '音源の波形と BPM グリッドに合わせて配置',
      '実機連携用の飛行経路を書き出し',
    ],
  },
  {
    image: 'fleet.jpg',
    no: '03',
    jp: '機体',
    en: 'FLEET',
    lines: ['660 機の状態をひと目で管理', '稼働・充電・整備・低電量で絞り込み'],
  },
  {
    image: 'schedule.jpg',
    no: '04',
    jp: '運航',
    en: 'SCHEDULE',
    lines: ['公演のカレンダーと当日のクルー', '天候と出発前の準備状況'],
  },
];
const FEATURE_SLOT = SCENES.features.dur / FEATURES.length; // 82.5

function Features() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      {FEATURES.map((f, i) => {
        const from = Math.round(i * FEATURE_SLOT);
        const dur = Math.round((i + 1) * FEATURE_SLOT) - from;
        return (
          <Sequence key={f.image} from={from} durationInFrames={dur}>
            <FeatureSlide feature={f} total={dur} first={i === 0} />
          </Sequence>
        );
      })}
      <div style={{ position: 'absolute', left: 120, top: 120, opacity: Math.min(1, frame / 12) }}>
        <Kicker color={COLORS.glow}>4 SCREENS — 画面</Kicker>
      </div>
    </AbsoluteFill>
  );
}

function FeatureSlide({
  feature,
  total,
  first,
}: {
  feature: Feature;
  total: number;
  first: boolean;
}) {
  const frame = useCurrentFrame();
  const vis = fade(frame, total, first ? 18 : 12, 12);
  const zoom = interpolate(frame, [0, total], [1.0, 1.05]);
  const slide = (1 - vis) * 40;

  return (
    <AbsoluteFill style={{ opacity: vis }}>
      <div style={{ position: 'absolute', left: 120, top: 330, width: 520 }}>
        <div
          style={{ fontFamily: FONT_DESIGN, fontWeight: 300, fontSize: 30, color: COLORS.textDim }}
        >
          {feature.no}
        </div>
        <div
          style={{
            fontFamily: FONT_MINCHO,
            fontSize: 96,
            color: '#fff',
            marginTop: 6,
            ...rise(frame, 2, 18),
          }}
        >
          {feature.jp}
        </div>
        <div
          style={{
            fontFamily: FONT_DESIGN,
            fontSize: 22,
            letterSpacing: '0.32em',
            color: COLORS.pink,
            marginTop: 6,
            ...rise(frame, 6, 18),
          }}
        >
          {feature.en}
        </div>
        <div style={{ marginTop: 40 }}>
          {feature.lines.map((line, i) => (
            <div
              key={line}
              style={{
                display: 'flex',
                gap: 16,
                alignItems: 'baseline',
                fontSize: 27,
                lineHeight: 1.6,
                color: COLORS.text,
                marginBottom: 14,
                ...rise(frame, 12 + i * 6, 14),
              }}
            >
              <span style={{ color: COLORS.glow, fontFamily: FONT_DESIGN }}>—</span>
              {line}
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 700,
          top: 200,
          width: 1100,
          height: 619,
          borderRadius: 16,
          overflow: 'hidden',
          border: `1px solid ${COLORS.hair}`,
          boxShadow: '0 40px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(49,169,199,0.08)',
          transform: `translateX(${slide}px)`,
        }}
      >
        <Img
          src={staticFile(feature.image)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `scale(${zoom})`,
            transformOrigin: '50% 40%',
          }}
        />
      </div>
    </AbsoluteFill>
  );
}

/* ---------- 870–1020 締め ---------- */

function Outro() {
  const frame = useCurrentFrame();
  const vis = fade(frame, SCENES.outro.dur, 20, 24);
  return (
    <AbsoluteFill style={{ opacity: vis }}>
      <DroneCloud steps={OUTRO_STEPS} cx={WIDTH / 2} cy={HEIGHT / 2 - 170} scale={3.6} />
      <AbsoluteFill
        style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 150 }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              ...rise(frame, 10),
              fontSize: 34,
              color: COLORS.text,
              letterSpacing: '0.08em',
            }}
          >
            インストール不要。ブラウザを開けば、夜空に 660 の星。
          </div>
          <div
            style={{
              ...rise(frame, 22, 28),
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'center',
              gap: 28,
              marginTop: 34,
            }}
          >
            <span
              style={{
                fontFamily: FONT_MINCHO,
                fontSize: 76,
                color: '#fff',
                letterSpacing: '0.12em',
              }}
            >
              星群
            </span>
            <span
              style={{
                fontFamily: FONT_DESIGN,
                fontWeight: 300,
                fontSize: 28,
                letterSpacing: '0.5em',
                color: COLORS.glow,
              }}
            >
              ASTRA FLOCK
            </span>
          </div>
          <div
            style={{
              ...rise(frame, 34),
              fontFamily: FONT_DESIGN,
              fontSize: 26,
              color: COLORS.pink,
              letterSpacing: '0.06em',
              marginTop: 26,
            }}
          >
            drone-show-astra-flock.vercel.app
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
