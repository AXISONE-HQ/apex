"use client";

import { useParams } from "next/navigation";

const sampleCheckins = [
  { name: "Noah Chen", time: "5:42 PM", status: "Checked in" },
  { name: "Liam Patel", time: "5:49 PM", status: "Checked in" },
  { name: "Emma Roy", time: "5:53 PM", status: "Pending waiver" },
  { name: "Ava Johnson", time: "6:02 PM", status: "Checked in" },
];

export default function TryoutCheckinQrPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || "";
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const signupUrl = `${appBaseUrl}/apex/tryout-signup/${id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(signupUrl)}`;

  return (
    <div className="min-h-screen bg-[#f4f5fb] p-6 print:p-0">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-white/55 bg-white/45 p-6 shadow-[0_12px_34px_rgba(17,24,39,0.14)] backdrop-blur-xl">
          <h1 className="text-xl font-semibold">Tryout QR Check-in</h1>
          <div className="mt-1 text-sm text-black/60">Tryout ID: {id}</div>
          <div className="mt-4 flex justify-center">
            <img src={qrUrl} alt="Tryout check-in QR code" className="h-[320px] w-[320px] rounded-xl border border-white/60" />
          </div>
          <div className="mt-3 break-all text-xs text-black/60">{signupUrl}</div>
          <button className="mt-4 rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-2 text-sm text-white" onClick={() => window.print()}>
            Print this page
          </button>
        </section>

        <section className="rounded-2xl border border-white/55 bg-white/45 p-6 text-black shadow-[0_12px_34px_rgba(17,24,39,0.14)] backdrop-blur-xl">
          <h2 className="text-lg font-semibold text-black">Players checked in</h2>
          <div className="mt-3 overflow-hidden rounded-lg border border-black/10">
            <table className="w-full text-sm">
              <thead className="bg-black/[0.03]">
                <tr className="text-left">
                  <th className="px-3 py-2">Player</th>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {sampleCheckins.map((p) => (
                  <tr key={`${p.name}-${p.time}`} className="border-t border-black/5">
                    <td className="px-3 py-2 font-medium">{p.name}</td>
                    <td className="px-3 py-2">{p.time}</td>
                    <td className="px-3 py-2">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
