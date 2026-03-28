export default function CustomerCard({ name, bitsId, email }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex flex-col gap-1">
      <span className="text-lg font-semibold text-white">{name}</span>
      <span className="text-sm text-gray-400 font-mono">{bitsId}</span>
      <span className="text-sm text-gray-400">{email}</span>
    </div>
  );
}
