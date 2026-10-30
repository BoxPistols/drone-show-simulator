import { useLayoutEffect, useRef, type MutableRefObject } from 'react';

/**
 * いつも最新の値を指す ref。
 * render の中で ref に書くと、React が render をやり直したり捨てたりしたときに
 * 画面に出ていない値が漏れるので、commit のあと（描画の前）に書く。
 * イベントハンドラや requestAnimationFrame から最新の props / state を読みたいときに使う。
 */
export function useLatestRef<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
