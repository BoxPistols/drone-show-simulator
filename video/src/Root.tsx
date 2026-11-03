import { Composition } from 'remotion';
import { Intro, TOTAL_FRAMES } from './Intro';
import { FPS, HEIGHT, WIDTH } from './theme';

export function Root() {
  return (
    <Composition
      id="Intro"
      component={Intro}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
}
