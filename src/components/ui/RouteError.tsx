import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

/**
 * route の lazy な import() が失敗したとき（回線切れ、デプロイ直後に古いチャンクが消えたなど）の画面。
 * React Router の既定のエラー画面には復旧の導線がないので、再読み込みボタンを出す。
 */
export function RouteError() {
  const error = useRouteError();
  const detail = isRouteErrorResponse(error)
    ? `${String(error.status)} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : '';
  return (
    <div className="route-error" role="alert">
      <p className="route-error-title">ページを読み込めませんでした</p>
      <p>接続を確認してから、再読み込みしてください。</p>
      {detail && <code className="route-error-detail">{detail}</code>}
      <button type="button" onClick={() => window.location.reload()}>
        再読み込み
      </button>
    </div>
  );
}
