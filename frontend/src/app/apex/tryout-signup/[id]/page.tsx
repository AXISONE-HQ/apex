export default async function TryoutSignupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-[#f4f5fb] p-6">
      <div className="mx-auto max-w-xl rounded-2xl border border-white/55 bg-white/35 p-6 shadow-[0_12px_34px_rgba(17,24,39,0.14)] backdrop-blur-2xl">
        <h1 className="text-xl font-semibold">Tryout sign up</h1>
        <p className="mt-2 text-sm text-black/70">Tryout ID: {id}</p>
        <p className="mt-2 text-sm text-black/60">Player signup form placeholder (next step).</p>
      </div>
    </div>
  );
}
