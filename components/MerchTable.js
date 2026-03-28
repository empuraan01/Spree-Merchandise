"use client";

export default function MerchTable({ items, selected, onToggle, selectedUndo = [], onUndoToggle }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-800 text-gray-400 text-left">
            <th className="px-4 py-3 font-medium">Item</th>
            <th className="px-4 py-3 font-medium">Size</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium text-center">Collect</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {items.map((item) => {
            const pendingUndo = selectedUndo.includes(item.skuId);
            return (
              <tr key={item.skuId} className="bg-gray-900 hover:bg-gray-800/60 transition-colors">
                <td className="px-4 py-3 text-white font-medium">{item.displayName}</td>
                <td className="px-4 py-3 text-gray-300">{item.size || "—"}</td>
                <td className="px-4 py-3">
                  {item.distributed ? (
                    <span className={`inline-flex items-center gap-1.5 font-medium ${pendingUndo ? "text-red-400" : "text-green-400"}`}>
                      <span className={`w-2 h-2 rounded-full inline-block ${pendingUndo ? "bg-red-400" : "bg-green-400"}`} />
                      {pendingUndo ? "Undo?" : "Distributed"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-amber-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                      Pending
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {item.distributed ? (
                    <button
                      onClick={() => onUndoToggle && onUndoToggle(item.skuId)}
                      className={`text-lg transition-colors ${pendingUndo ? "text-red-400 hover:text-red-300" : "text-green-400 hover:text-red-400"}`}
                      title={pendingUndo ? "Cancel undo" : "Click to undo distribution"}
                    >
                      {pendingUndo ? "✗" : "✓"}
                    </button>
                  ) : (
                    <input
                      type="checkbox"
                      checked={selected.includes(item.skuId)}
                      onChange={() => onToggle(item.skuId)}
                      className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-500 cursor-pointer accent-blue-500"
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
