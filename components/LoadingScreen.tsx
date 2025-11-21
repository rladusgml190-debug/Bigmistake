import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in duration-500">
      <div className="relative">
        <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20 rounded-full"></div>
        <Loader2 className="w-16 h-16 text-purple-600 animate-spin relative z-10" />
      </div>
      <h2 className="mt-8 text-2xl font-bold text-gray-800">당신의 예술 세포를 분석 중입니다...</h2>
      <p className="mt-2 text-gray-500">AI 뮤즈와 접선 중</p>
      
      <div className="mt-8 w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-purple-600 animate-[loading_2s_ease-in-out_infinite] w-1/3 rounded-full"></div>
      </div>
      
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(200%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;