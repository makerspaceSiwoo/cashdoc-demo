export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        gap: '0.75rem',
      }}
    >
      <h1 style={{ fontSize: '2rem', fontWeight: 600 }}>
        Hello Next 15 + React 19
      </h1>
      <p style={{ color: '#666' }}>가장 간단한 데모 페이지입니다.</p>
    </main>
  );
}
