export default function StatsCard({ label, value, color = "text-white" }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex flex-col gap-1">
      <span className={`text-3xl font-bold ${color}`}>{value ?? "—"}</span>
      <span className="text-sm text-gray-400">{label}</span>
    </div>
  );
}
