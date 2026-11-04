import type { CSSProperties, ReactNode } from 'react';
import { createContext, useContext, useMemo } from 'react';
import {
  AbsoluteFill,
  Audio,
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
import { type Layout, LANDSCAPE } from './layout';
import { COLORS, FONT_DESIGN, FONT_MINCHO, FONT_SANS } from './theme';
import {
  APP_FORMATION_IDS,
  FEATURE_COUNT,
  FORMATION_ORDER,
  FORMATION_SLOT,
  SCENES,
  TITLE_FRAME,
  featureStart,
  formationStart,
} from './timeline';

/** 銀河は平たい円盤なので、斜め上から見下ろす */
const GALAXY_TILT = -0.85;

/** 冒頭から演目シーンの終わりまで、点群は一続きで動かす */
const MAIN_STEPS: CloudStep[] = [
  { id: 'ground', frame: 0, morph: 1 },
  { id: 'sphere', frame: 12, morph: 80 },
  ...FORMATION_ORDER.map((id, i) => ({
    id,
    frame: formationStart(i),
    morph: 34,
    tilt: id === 'galaxy' ? GALAXY_TILT : undefined,
  })),
];

const OUTRO_STEPS: CloudStep[] = [{ id: 'galaxy', frame: 0, morph: 1, tilt: GALAXY_TILT }];

const LayoutContext = createContext<Layout>(LANDSCAPE);
const useLayout = () => useContext(LayoutContext);

export type IntroProps = { layout: Layout };

export function Intro({ layout }: IntroProps) {
  const frame = useCurrentFrame();
  const mainEnd = SCENES.features.from;
  const cloudOpacity = interpolate(frame, [mainEnd - 20, mainEnd], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // オープニングではタイトルの上に置き、演目に入るところで説明文を避けた位置へ移す
  const move = interpolate(
    frame,
    [SCENES.formations.from - 20, SCENES.formations.from + 20],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) }
  );
  const { opening: a, formations: b } = layout.cloud;
  const lerp = (x: number, y: number) => x + (y - x) * move;

  return (
    <LayoutContext.Provider value={layout}>
      <AbsoluteFill style={{ backgroundColor: COLORS.sky0, fontFamily: FONT_SANS }}>
        {/* 音楽は scripts/music.ts で合成する（pnpm music。render / studio の前に自動で走る） */}
        <Audio src={staticFile('music.wav')} />
        <Sky />
        {frame < mainEnd && (
          <DroneCloud
            steps={MAIN_STEPS}
            cx={lerp(a.x, b.x)}
            cy={lerp(a.y, b.y)}
            scale={lerp(a.scale, b.scale)}
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
    </LayoutContext.Provider>
  );
}

/* ---------- 背景 ---------- */

/** アプリの #stars-bg と同じグラデーションに、ゆっくり瞬く星を重ねる */
function Sky() {
  const frame = useCurrentFrame();
  const { width, height } = useLayout();
  const stars = useMemo(() => {
    const rnd = prng(7);
    const count = Math.round((width * height) / 9400); // 1920×1080 で約 220 個
    return Array.from({ length: count }, () => ({
      x: rnd() * width,
      y: rnd() * height,
      r: 0.6 + rnd() * 1.4,
      phase: rnd() * Math.PI * 2,
    }));
  }, [width, height]);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 80% 40% at 50% 100%, #1e2a4a66, transparent 70%),
          radial-gradient(ellipse at 70% 20%, #0e153088, transparent 55%),
          radial-gradient(ellipse at 50% 50%, ${COLORS.sky1}, ${COLORS.sky0} 80%)`,
      }}
    >
      <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
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

/* ---------- オープニング ---------- */

function Opening() {
  const frame = useCurrentFrame();
  const L = useLayout();
  const out = fade(frame, SCENES.opening.dur, 1, 18);
  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: L.opening.bottom,
        opacity: out,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{ ...rise(frame, TITLE_FRAME - 12), display: 'flex', justifyContent: 'center' }}
        >
          <Kicker>A FLOCK OF 660 ARTIFICIAL STARS</Kicker>
        </div>
        <div
          style={{
            ...rise(frame, TITLE_FRAME, 32),
            fontFamily: FONT_MINCHO,
            fontSize: L.opening.title,
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
            ...rise(frame, TITLE_FRAME + 12),
            fontFamily: FONT_DESIGN,
            fontWeight: 300,
            fontSize: L.opening.tagline,
            letterSpacing: '0.6em',
            color: COLORS.glow,
            marginTop: 4,
          }}
        >
          ASTRA FLOCK
        </div>
        <div
          style={{
            ...rise(frame, TITLE_FRAME + 28),
            fontSize: L.opening.tagline,
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

/* ---------- 演目 ---------- */

function FormationLabels() {
  const frame = useCurrentFrame();
  const L = useLayout();
  const slot = Math.min(FORMATION_ORDER.length - 1, Math.floor(frame / FORMATION_SLOT));
  const local = frame - slot * FORMATION_SLOT;
  const f = findFormation(FORMATION_ORDER[slot]!)!;
  const index = (APP_FORMATION_IDS as readonly string[]).indexOf(f.id) + 1;
  const vis = fade(local, FORMATION_SLOT, 14, 12);
  const badge: CSSProperties =
    L.formation.badge === 'bottom-right'
      ? { right: L.pad, bottom: L.pad, textAlign: 'right' }
      : { left: 0, right: 0, bottom: L.pad + 40, textAlign: 'center' };

  return (
    <AbsoluteFill style={{ padding: `${L.formation.top}px ${L.pad}px` }}>
      <div style={{ opacity: Math.min(1, frame / 14) }}>
        <Kicker>NOW SHOWING — 演目</Kicker>
      </div>
      <div style={{ opacity: vis, transform: `translateX(${(1 - vis) * -24}px)`, marginTop: 26 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, color: '#fff' }}>
          <span
            style={{
              fontFamily: FONT_DESIGN,
              fontWeight: 300,
              fontSize: L.formation.number,
              lineHeight: 1,
            }}
          >
            {String(index).padStart(2, '0')}
          </span>
          <span
            style={{
              fontFamily: FONT_DESIGN,
              fontWeight: 300,
              fontSize: L.formation.number * 0.3,
              color: COLORS.textDim,
            }}
          >
            /09
          </span>
        </div>
        <div
          style={{
            fontFamily: FONT_MINCHO,
            fontSize: L.formation.name,
            color: '#fff',
            marginTop: 14,
          }}
        >
          {f.jp}
        </div>
        <div
          style={{
            fontFamily: FONT_DESIGN,
            fontSize: L.formation.desc,
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
            width: L.formation.descWidth,
            fontSize: L.formation.desc,
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
          ...badge,
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

/* ---------- 画面紹介 ---------- */

type Feature = {
  image: string;
  no: string;
  jp: string;
  en: string;
  lines: string[];
  /** 縦長で切り出すときの横位置（0–100%）。見せたい部分が中央に無い画面だけ指定する */
  focusX?: number;
};

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
    image: 'pov.jpg',
    no: '02',
    // 4 機の目線の小窓は右端にあるので、右寄せで切り出す
    focusX: 100,
    jp: '機体目線',
    en: 'DRONE VIEW',
    lines: [
      '点をクリックして、その機体に乗る',
      '最大 4 機の目線を小窓で同時に',
      '機体管理の画面から目線へ直接移動',
    ],
  },
  {
    image: 'choreo.jpg',
    no: '03',
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
    // 見出しと絞り込みは左にあるので、左寄せで切り出す
    focusX: 0,
    no: '04',
    jp: '機体',
    en: 'FLEET',
    lines: ['660 機の状態をひと目で管理', '稼働・充電・整備・低電量で絞り込み'],
  },
  {
    image: 'schedule.jpg',
    // 見出しと絞り込みは左にあるので、左寄せで切り出す
    focusX: 0,
    no: '05',
    jp: '運航',
    en: 'SCHEDULE',
    lines: ['公演のカレンダーと当日のクルー', '天候と出発前の準備状況'],
  },
];
if (FEATURES.length !== FEATURE_COUNT) {
  throw new Error('FEATURES と timeline.ts の FEATURE_COUNT を揃える');
}

function Features() {
  const frame = useCurrentFrame();
  const L = useLayout();
  return (
    <AbsoluteFill>
      {FEATURES.map((f, i) => {
        const from = featureStart(i);
        const dur = featureStart(i + 1) - from;
        return (
          <Sequence key={f.image} from={from} durationInFrames={dur}>
            <FeatureSlide feature={f} total={dur} first={i === 0} />
          </Sequence>
        );
      })}
      <div
        style={{
          position: 'absolute',
          left: L.pad,
          top: L.feature.shot.top - 80,
          opacity: Math.min(1, frame / 12),
        }}
      >
        <Kicker color={COLORS.glow}>{`${FEATURE_COUNT} VIEWS — 画面`}</Kicker>
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
  const L = useLayout();
  const vis = fade(frame, total, first ? 18 : 12, 12);
  const zoom = interpolate(frame, [0, total], [1.0, 1.05]);
  const slide = (1 - vis) * 40;
  const { shot, caption } = L.feature;

  return (
    <AbsoluteFill style={{ opacity: vis }}>
      <div
        style={{ position: 'absolute', left: caption.left, top: caption.top, width: caption.width }}
      >
        <div
          style={{ fontFamily: FONT_DESIGN, fontWeight: 300, fontSize: 30, color: COLORS.textDim }}
        >
          {feature.no}
        </div>
        <div
          style={{
            fontFamily: FONT_MINCHO,
            fontSize: L.feature.title,
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
                fontSize: L.feature.line,
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
          ...shot,
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
            objectPosition: `${feature.focusX ?? 50}% 50%`,
            transform: `scale(${zoom})`,
            transformOrigin: `${feature.focusX ?? 50}% 40%`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
}

/* ---------- 締め ---------- */

function Outro() {
  const frame = useCurrentFrame();
  const L = useLayout();
  const vis = fade(frame, SCENES.outro.dur, 20, 24);
  const c = L.cloud.outro;
  return (
    <AbsoluteFill style={{ opacity: vis }}>
      <DroneCloud steps={OUTRO_STEPS} cx={c.x} cy={c.y} scale={c.scale} />
      <AbsoluteFill
        style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: L.outro.bottom }}
      >
        <div style={{ textAlign: 'center', padding: `0 ${L.pad}px` }}>
          <div
            style={{
              ...rise(frame, 10),
              fontSize: L.outro.lead,
              lineHeight: 1.6,
              color: COLORS.text,
              letterSpacing: '0.08em',
            }}
          >
            インストール不要。
            {L.outro.stacked ? <br /> : null}
            ブラウザを開けば、夜空に 660 の星。
          </div>
          <div
            style={{
              ...rise(frame, 22, 28),
              display: 'flex',
              flexDirection: L.outro.stacked ? 'column' : 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: L.outro.stacked ? 4 : 28,
              marginTop: 34,
            }}
          >
            <span
              style={{
                fontFamily: FONT_MINCHO,
                fontSize: L.outro.title,
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
                fontSize: L.outro.title * 0.37,
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
              fontSize: L.outro.url,
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
