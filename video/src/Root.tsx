import { Composition } from 'remotion';
import { Intro } from './Intro';
import { LANDSCAPE, PORTRAIT } from './layout';
import { FPS, TOTAL_FRAMES } from './timeline';

export function Root() {
  return (
    <>
      {/* 横長：YouTube・サイト用 */}
      <Composition
        id="Intro"
        component={Intro}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={LANDSCAPE.width}
        height={LANDSCAPE.height}
        defaultProps={{ layout: LANDSCAPE }}
      />
      {/* 縦長：Instagram リール・TikTok・YouTube ショート用 */}
      <Composition
        id="IntroVertical"
        component={Intro}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={PORTRAIT.width}
        height={PORTRAIT.height}
        defaultProps={{ layout: PORTRAIT }}
      />
    </>
  );
}
