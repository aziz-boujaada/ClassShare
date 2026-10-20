import React from 'react';
import type { CodingChallengeParticipant } from '../../types/index.ts';

type ChallengeParticipantsProps = {
  participants?: CodingChallengeParticipant[];
};

export const ChallengeParticipants: React.FC<ChallengeParticipantsProps> = ({ participants = [] }) => {
  const visible = participants.slice(0, 5);

  return (
    <div className="flex items-center gap-2" aria-label={`${participants.length} élève(s) inscrit(s) à ce défi`}>
      {participants.length > 0 ? (
        <div className="flex -space-x-2" aria-hidden="true">
          {visible.map((participant) => (
            <img
              key={participant.id}
              src={participant.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(participant.username)}`}
              alt=""
              title={participant.full_name || participant.username}
              className="h-8 w-8 rounded-full border-2 border-white bg-slate-100 object-cover dark:border-slate-900 dark:bg-slate-800"
            />
          ))}
          {participants.length > visible.length && (
            <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-bold text-slate-600 dark:border-slate-900 dark:bg-slate-800 dark:text-slate-300">
              +{participants.length - visible.length}
            </span>
          )}
        </div>
      ) : (
        <span className="text-xs text-slate-400">Soyez le premier à participer</span>
      )}
      {participants.length > 0 && <span className="text-xs text-slate-500 dark:text-slate-400">{participants.length} inscrit{participants.length > 1 ? 's' : ''}</span>}
    </div>
  );
};
