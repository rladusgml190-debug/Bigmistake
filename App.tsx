import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QUESTIONS, SCHOOLS } from './constants';
import { School, Trait, AIAnalysisResult } from './types';
import { getSchoolAnalysis } from './services/geminiService';
import LoadingScreen from './components/LoadingScreen';
import ProgressBar from './components/ProgressBar';
import { ArrowRight, RefreshCw, Share2, Sparkles, ChevronRight, GraduationCap, Check, Download, Link as LinkIcon, X, MessageCircle } from 'lucide-react';

type GameState = 'intro' | 'quiz' | 'analyzing' | 'result';

// Simple Toast Component
const Toast = ({ message, onClose }: { message: string; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <Check className="w-4 h-4 text-green-400" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

// Share Modal Component
const ShareModal = ({ isOpen, onClose, onCopyLink, onDownloadImage }: { isOpen: boolean; onClose: () => void; onCopyLink: () => void; onDownloadImage: () => void }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl transform scale-100 animate-in zoom-in-95 duration-200 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">결과 공유하기</h3>
        <div className="space-y-3">
          <button
            onClick={onCopyLink}
            className="w-full flex items-center justify-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-100"
          >
            <div className="bg-blue-100 p-2 rounded-full text-blue-600">
              <LinkIcon className="w-5 h-5" />
            </div>
            <span className="font-medium text-gray-700">링크 복사하기</span>
          </button>
          <button
            onClick={onDownloadImage}
            className="w-full flex items-center justify-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-100"
          >
            <div className="bg-purple-100 p-2 rounded-full text-purple-600">
              <Download className="w-5 h-5" />
            </div>
            <span className="font-medium text-gray-700">이미지로 저장하기</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userTraits, setUserTraits] = useState<Trait[]>([]);
  const [matchedSchool, setMatchedSchool] = useState<School | null>(null);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  
  const resultRef = useRef<HTMLDivElement>(null);

  const handleStart = () => {
    setGameState('quiz');
    setCurrentQuestionIndex(0);
    setUserTraits([]);
  };

  const handleAnswer = (traits: Trait[]) => {
    const updatedTraits = [...userTraits, ...traits];
    setUserTraits(updatedTraits);

    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      calculateResult(updatedTraits);
    }
  };

  const calculateResult = useCallback(async (finalTraits: Trait[]) => {
    setGameState('analyzing');

    // 1. Count traits
    const traitCounts: Record<string, number> = {};
    finalTraits.forEach((trait) => {
      traitCounts[trait] = (traitCounts[trait] || 0) + 1;
    });

    // 2. Score schools
    let bestSchool = SCHOOLS[0];
    let maxScore = -1;

    SCHOOLS.forEach((school) => {
      let score = 0;
      school.tags.forEach((tag) => {
        if (traitCounts[tag]) {
          score += traitCounts[tag];
        }
      });
      // Simple tie-breaker
      score += Math.random() * 0.1; 

      if (score > maxScore) {
        maxScore = score;
        bestSchool = school;
      }
    });

    setMatchedSchool(bestSchool);

    // 3. Call AI
    const topTraits = Object.entries(traitCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([t]) => t);

    const analysis = await getSchoolAnalysis(bestSchool, topTraits);
    setAiResult(analysis);
    setGameState('result');
  }, []);

  const handleRetry = () => {
    setGameState('intro');
    setMatchedSchool(null);
    setAiResult(null);
    setUserTraits([]);
    setShowShareModal(false);
  };

  const handleCopyLink = async () => {
    const shareData = {
      title: 'ArtSoul - 해외 명문미대 매칭 테스트',
      text: `저의 예술가 페르소나는 "${aiResult?.persona}"이고, 운명의 학교는 ${matchedSchool?.name}입니다! ArtSoul에서 당신의 학교도 찾아보세요.`,
      url: window.location.href,
    };

    // Use Web Share API if available and supported (mainly mobile)
    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
      try {
        await navigator.share(shareData);
        setShowShareModal(false);
        return;
      } catch (err) {
        console.log('Share dismissed or failed, falling back to copy');
      }
    }

    // Fallback to Clipboard
    try {
      await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
      setToastMessage('링크가 복사되었습니다!');
      setShowToast(true);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = `${shareData.text}\n${shareData.url}`;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setToastMessage('링크가 복사되었습니다!');
        setShowToast(true);
      } catch (e) {
         alert('복사하기를 지원하지 않는 브라우저입니다.');
      }
      document.body.removeChild(textArea);
    }
    setShowShareModal(false);
  };

  const handleSaveImage = async () => {
    if (resultRef.current && (window as any).html2canvas) {
      try {
        // Temporarily remove shadows or elements that might render poorly if needed, 
        // but html2canvas is usually okay with basic css.
        setToastMessage('이미지 생성 중...');
        setShowToast(true);
        
        const canvas = await (window as any).html2canvas(resultRef.current, {
          useCORS: true,
          scale: 2, // Higher resolution
          backgroundColor: '#ffffff',
        });

        const link = document.createElement('a');
        link.download = `ArtSoul_${matchedSchool?.shortName}_Result.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
        
        setShowShareModal(false);
        setToastMessage('이미지가 저장되었습니다!');
      } catch (error) {
        console.error('Image generation failed:', error);
        setToastMessage('이미지 저장에 실패했습니다.');
      }
    } else {
      setToastMessage('이미지 저장 기능을 불러오는 중입니다.');
    }
  };

  // --- RENDER HELPERS ---

  const renderIntro = () => (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center bg-white relative overflow-hidden">
       {/* Background decorative elements */}
       <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[30%] bg-purple-200 rounded-full blur-[80px] opacity-40" />
       <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[30%] bg-blue-200 rounded-full blur-[80px] opacity-40" />

      <div className="z-10 max-w-md w-full">
        <div className="inline-flex items-center justify-center p-3 mb-6 bg-black rounded-2xl shadow-xl rotate-[-3deg]">
          <Sparkles className="w-8 h-8 text-yellow-400 mr-2" />
          <span className="text-white font-bold text-xl tracking-wider">ArtSoul</span>
        </div>
        
        <h1 className="text-4xl font-bold text-gray-900 mb-6 leading-[1.2] break-keep">
          나에게 운명 같은<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
            해외 명문 미대는?
          </span>
        </h1>
        
        <p className="text-lg text-gray-600 mb-10 leading-relaxed break-keep">
          나만의 예술적 성향을 분석해<br/>가장 잘 어울리는 해외 미대를 찾아드립니다.
        </p>

        <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur opacity-30 group-hover:opacity-75 transition duration-200"></div>
            <button
            onClick={handleStart}
            className="relative w-full bg-black text-white font-bold py-5 px-8 rounded-xl text-xl flex items-center justify-center hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl"
            >
            테스트 시작하기
            <ArrowRight className="ml-2 w-6 h-6" />
            </button>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-400">
          <GraduationCap className="w-4 h-4" />
          <span>Powered by Gemini AI</span>
        </div>
      </div>
    </div>
  );

  const renderQuiz = () => {
    const question = QUESTIONS[currentQuestionIndex];

    return (
      <div className="flex flex-col min-h-screen bg-white">
        <div className="px-6 pt-8 pb-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-gray-400">
              질문 {currentQuestionIndex + 1} / {QUESTIONS.length}
            </span>
          </div>
          <ProgressBar current={currentQuestionIndex} total={QUESTIONS.length} />
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 pb-12 max-w-md mx-auto w-full">
          <h2 className="text-2xl font-bold text-gray-900 mb-10 leading-tight break-keep animate-in slide-in-from-bottom-4 fade-in duration-500" key={question.id}>
            {question.question}
          </h2>

          <div className="space-y-4">
            {question.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(option.traits)}
                className="w-full text-left p-5 rounded-2xl border-2 border-gray-100 hover:border-black hover:bg-gray-50 transition-all duration-200 group active:scale-[0.98]"
              >
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-700 group-hover:text-black break-keep">
                    {option.text}
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-black transition-colors flex-shrink-0 ml-2" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderResult = () => {
    if (!matchedSchool || !aiResult) return null;

    return (
      <div className="min-h-screen bg-white flex flex-col items-center">
        <div ref={resultRef} className="w-full max-w-md flex-1 flex flex-col relative bg-white pb-10">
          
          {/* Hero Header */}
          <div className={`w-full h-64 ${matchedSchool.color} relative flex flex-col items-center justify-center text-white rounded-b-[3rem] shadow-lg overflow-hidden`}>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
            <div className="z-10 text-center px-6 mt-4">
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold tracking-wider mb-3">
                PERFECT MATCH
              </span>
              <h1 className="text-5xl font-bold mb-2 tracking-tighter">{matchedSchool.shortName}</h1>
              <p className="text-white/90 font-medium">{matchedSchool.name}</p>
              <div className="flex items-center justify-center gap-2 mt-2 text-xs opacity-80">
                <span className="uppercase tracking-widest">{matchedSchool.location}</span>
              </div>
            </div>
          </div>

          <div className="px-6 pt-12 space-y-8 animate-in slide-in-from-bottom-8 fade-in duration-700">
            
            {/* Persona Card */}
            <div className="text-center">
                <p className="text-sm text-gray-400 uppercase tracking-wide font-bold mb-2">나의 크리에이티브 페르소나</p>
                <div className="inline-block px-6 py-2 bg-black text-white text-xl font-bold rounded-full shadow-lg transform -rotate-1">
                    {aiResult.persona}
                </div>
            </div>

            {/* AI Analysis */}
            <div className={`${matchedSchool.bgAccent} p-6 rounded-2xl border border-gray-100 relative overflow-hidden`}>
              <div className={`absolute top-0 left-0 w-1 h-full ${matchedSchool.color}`}></div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className={`w-5 h-5 ${matchedSchool.textColor}`} />
                <h3 className={`font-bold ${matchedSchool.textColor}`}>{matchedSchool.shortName}가 찰떡인 이유</h3>
              </div>
              <p className="text-gray-700 leading-relaxed mb-4 font-medium break-keep">
                {aiResult.whyMatch}
              </p>
              <div className="bg-white/60 p-4 rounded-xl">
                 <p className="text-sm text-gray-500 uppercase font-bold mb-1 text-[10px] tracking-wider">합격 꿀팁</p>
                 <p className="text-gray-800 text-sm italic break-keep">"{aiResult.advice}"</p>
              </div>
            </div>

            {/* School Details */}
            <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">학교 소개</h3>
                <p className="text-gray-600 leading-relaxed text-sm break-keep">
                    {matchedSchool.description}
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                    {matchedSchool.tags.map(tag => (
                        <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium capitalize">
                            #{tag.replace('_', ' ')}
                        </span>
                    ))}
                </div>
            </div>

            {/* Logo/Footer for Image Capture */}
            <div className="text-center pt-4 pb-2 opacity-60">
                <p className="text-[10px] font-medium text-gray-400">ART SOUL TEST</p>
            </div>
          </div>
        </div>

        {/* Fixed Action Buttons (Outside of ref, so they are not captured) */}
        <div className="w-full max-w-md px-6 pb-10 space-y-3">
            <button
            onClick={() => setShowShareModal(true)}
            className="w-full bg-black text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-opacity active:scale-[0.98]"
            >
            <Share2 className="w-5 h-5" />
            결과 공유하기
            </button>
            <button
            onClick={handleRetry}
            className="w-full bg-white border-2 border-gray-200 text-gray-700 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors active:scale-[0.98]"
            >
            <RefreshCw className="w-5 h-5" />
            다시 하기
            </button>
            
            <a 
                href="http://pf.kakao.com/_QKxfpxl/chat" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full bg-[#FEE500] text-[#3A1D1D] py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:opacity-90 transition-opacity active:scale-[0.98]"
            >
                <MessageCircle className="w-5 h-5" />
                입시 상담 및 장학금 확인하기
            </a>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-[480px] min-h-screen shadow-2xl overflow-hidden bg-white relative">
      {gameState === 'intro' && renderIntro()}
      {gameState === 'quiz' && renderQuiz()}
      {gameState === 'analyzing' && <LoadingScreen />}
      {gameState === 'result' && renderResult()}
      {showToast && <Toast message={toastMessage} onClose={() => setShowToast(false)} />}
      <ShareModal 
        isOpen={showShareModal} 
        onClose={() => setShowShareModal(false)} 
        onCopyLink={handleCopyLink}
        onDownloadImage={handleSaveImage}
      />
    </div>
  );
};

export default App;