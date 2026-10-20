import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

interface LikeButtonProps {
  presentationId: string;
  initialLiked?: boolean;
  initialCount?: number;
  onLikeChanged?: (liked: boolean, count: number) => void;
  size?: 'sm' | 'md' | 'lg';
}

export const LikeButton: React.FC<LikeButtonProps> = ({
  presentationId,
  initialLiked = false,
  initialCount = 0,
  onLikeChanged,
  size = 'md',
}) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      alert('Veuillez vous connecter pour aimer cette présentation.');
      return;
    }

    // Optimistic update
    const nextLiked = !liked;
    const nextCount = nextLiked ? count + 1 : Math.max(0, count - 1);
    setLiked(nextLiked);
    setCount(nextCount);

    if (nextLiked) {
      // Confetti burst
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#6366f1', '#ec4899', '#8b5cf6'],
      });
    }

    try {
      setLoading(true);
      const res = await api.toggleLike(presentationId);
      setLiked(res.liked);
      setCount(res.count);
      onLikeChanged?.(res.liked, res.count);
    } catch (err) {
      // Revert optimistic update
      setLiked(liked);
      setCount(count);
      console.error('Like toggle failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1 gap-1.5',
    md: 'text-sm px-3.5 py-1.5 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      aria-label={liked ? 'Retirer mon like' : 'Aimer cette présentation'}
      className={`inline-flex items-center rounded-full font-medium transition-all duration-200 border ${
        sizeClasses[size]
      } ${
        liked
          ? 'bg-rose-50 text-rose-600 border-rose-200 shadow-sm dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/60'
          : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50/50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:border-rose-800 dark:hover:text-rose-400'
      }`}
    >
      <Heart
        className={`${iconSizes[size]} transition-transform duration-200 ${
          liked ? 'fill-rose-500 text-rose-500 scale-110' : 'text-current'
        }`}
      />
      <span>{count}</span>
    </button>
  );
};
