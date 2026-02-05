export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Plainly Backend API</h1>
      <p>The backend is running.</p>
      <h2>Endpoints:</h2>
      <ul>
        <li>
          <code>POST /api/process-recording</code> - Process audio recording
        </li>
      </ul>
    </main>
  )
}
