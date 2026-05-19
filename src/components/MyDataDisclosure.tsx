import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface MyDataDisclosureProps {
  roomId: string;
  ownerToken: string;
}

export function MyDataDisclosure({ roomId, ownerToken }: MyDataDisclosureProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleExport = () => {
    window.location.href = api.exportRoomUrl(roomId, ownerToken);
  };

  const handleDelete = async () => {
    const confirmation = prompt(
      `This permanently deletes the room, all agents, and all events.\n\nType the room ID to confirm: ${roomId}`,
    );
    if (confirmation?.trim() !== roomId) {
      if (confirmation !== null) alert('Room ID did not match. Nothing was deleted.');
      return;
    }
    setDeleting(true);
    try {
      await api.deleteRoom(roomId, ownerToken);
      navigate('/', { replace: true });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete room');
      setDeleting(false);
    }
  };

  return (
    <div className="mt-6 flex justify-end">
      <div className="flex flex-col items-end">
        {open && (
          <div className="w-full max-w-[360px] border-[2.5px] border-red-700 bg-red-50 rounded-xl shadow-brutal-sm text-left overflow-hidden">
            <header className="flex items-center justify-between bg-red-700 text-paper px-3 py-1.5">
              <h3 className="font-display text-[10px] tracking-widest">MY DATA</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="font-display text-xs leading-none px-1 hover:opacity-80"
              >
                ✕
              </button>
            </header>
            <div className="p-3">
              <p className="text-[11px] opacity-70 mb-3 leading-snug">
                Export downloads this room, every agent, and every event as JSON. Delete
                permanently removes everything tied to this room.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleExport}
                  className="w-full bg-accent-yellow border-[2.5px] border-ink rounded-lg px-3 py-2 font-display text-xs tracking-wider shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] transition"
                >
                  ↓ EXPORT MY DATA
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full bg-red-700 text-paper border-[2.5px] border-ink rounded-lg px-3 py-2 font-display text-xs tracking-wider shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] transition disabled:opacity-60"
                >
                  {deleting ? 'DELETING…' : '✕ DELETE MY DATA'}
                </button>
              </div>
            </div>
          </div>
        )}
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={false}
            className="font-display text-[10px] tracking-widest opacity-50 hover:opacity-100 transition"
          >
            ▴ MANAGE MY DATA
          </button>
        )}
      </div>
    </div>
  );
}
