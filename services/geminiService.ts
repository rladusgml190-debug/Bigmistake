import { GoogleGenAI, Type } from "@google/genai";
import { School, AIAnalysisResult } from "../types";

// Initialize the client with the API key from the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getSchoolAnalysis = async (
  school: School,
  userTraits: string[]
): Promise<AIAnalysisResult> => {
  const modelId = "gemini-2.5-flash";

  const prompt = `
    사용자가 아트 스쿨 성향 테스트를 완료했습니다.
    매칭된 학교: ${school.name} (${school.shortName}).
    사용자의 주요 성향: ${userTraits.join(", ")}.
    
    이 학교가 사용자에게 왜 잘 맞는지 재미있는 MZ세대 스타일로 분석해주세요.
    반드시 **한국어(Korean)**로 작성해야 합니다.
    
    다음 속성을 포함한 JSON 객체만 반환하세요:
    - persona: 사용자를 위한 창의적인 2~3단어 별명 (예: "디지털 다빈치", "패션 반항아").
    - whyMatch: 사용자의 성향과 이 학교가 왜 찰떡궁합인지 설명하는 2문장.
    - advice: 이 학교 입시나 포트폴리오 준비를 위한 구체적이고 실질적인 꿀팁 1개.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            persona: { type: Type.STRING },
            whyMatch: { type: Type.STRING },
            advice: { type: Type.STRING },
          },
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from Gemini");
    }

    return JSON.parse(text) as AIAnalysisResult;
  } catch (error) {
    console.error("Error fetching Gemini analysis:", error);
    // Fallback content in case of API failure/quota limits
    return {
      persona: "창의적인 비전가",
      whyMatch: `당신의 ${userTraits[0]} 성향이 ${school.shortName}의 교육 철학과 완벽하게 일치합니다. 당신이 있어야 할 곳은 바로 여기입니다!`,
      advice: "포트폴리오에서 당신만의 독특한 작업 과정을 보여주는 데 집중하세요.",
    };
  }
};