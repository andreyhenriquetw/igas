"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="loading-page error-page" role="alert">
      <strong>Não foi possível carregar esta página.</strong>
      <p>Verifique sua conexão e tente novamente.</p>
      <button className="button button-primary" type="button" onClick={reset}>Tentar novamente</button>
    </main>
  );
}
